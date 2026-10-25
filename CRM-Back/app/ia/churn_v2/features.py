"""
ÚNICA fuente de verdad de las variables (features) del modelo de abandono v2.

La usan, sin cambios, el script de entrenamiento (`entrenar.py`) y la API Flask
(`servicio.py`). Así se elimina el "training-serving skew" del modelo v1, donde la
frecuencia de compra se calculaba como compras/mes al entrenar y como días/compra
en producción.

Reglas de diseño
----------------
1. Todo se calcula respecto a `fecha_referencia` (nunca `datetime.now()`):
   en entrenamiento es la fecha de corte; en producción, la fecha de la corrida.
2. Solo se usan compras con fecha < fecha_referencia (sin mirar al futuro).
3. Solo se usan compras dentro de la ventana de observación (por defecto 365 días),
   para que un cliente de la tienda tenga las mismas variables que uno del dataset.
4. Los montos se expresan RELATIVOS a la mediana de la propia tienda. El modelo
   no depende de la moneda (libras, dólares o pesos) ni del tamaño del negocio:
   "este cliente compra 2 veces el ticket típico de su tienda".
"""
from __future__ import annotations

import numpy as np
import pandas as pd

VENTANA_OBSERVACION_DIAS = 365

FEATURES = [
    "recencia_dias",         # días desde la última compra
    "frecuencia",            # nº de compras en la ventana de observación
    "antiguedad_dias",       # días desde la primera compra en la ventana
    "compras_por_mes",       # frecuencia / meses de antigüedad (mín. 1 mes)
    "compras_30d",           # compras en los últimos 30 días
    "compras_90d",           # compras en los últimos 90 días
    "tendencia_90d",         # compras_90d - compras de los 90 días anteriores
    "intercompra_media",     # días promedio entre compras
    "intercompra_cv",        # irregularidad: desviación / media de los intervalos
    "ratio_recencia",        # recencia / intercompra_media (recencia relativa a su ritmo)
    "compra_unica",          # 1 si solo tiene una compra en la ventana
    "log_ticket_relativo",   # log(ticket medio del cliente / ticket mediano de la tienda)
    "log_monetario_relativo",  # log(gasto total / gasto mediano por cliente en la tienda)
]


def _a_compras(trans: pd.DataFrame) -> pd.DataFrame:
    """Agrupa líneas de factura en compras: una fila por (cliente, factura)."""
    return (trans.groupby(["tienda_id", "cliente_id", "factura_id"], sort=False)
                 .agg(fecha=("fecha", "min"), monto=("monto", "sum"))
                 .reset_index())


def construir_features(trans: pd.DataFrame, fecha_referencia,
                       obs_dias: int = VENTANA_OBSERVACION_DIAS) -> pd.DataFrame:
    """Calcula las features de cada cliente con al menos una compra en la ventana.

    Parámetros
    ----------
    trans : DataFrame con columnas cliente_id, factura_id, fecha, monto, tienda_id.
    fecha_referencia : fecha de corte; solo se usan compras ESTRICTAMENTE anteriores.
    obs_dias : longitud de la ventana de observación.

    Devuelve un DataFrame indexado por cliente_id con las columnas de FEATURES
    más 'tienda_id'. Los clientes sin compras en la ventana NO aparecen: son
    "sin historial" y se tratan con una regla de negocio, no con el modelo.
    """
    ref = pd.Timestamp(fecha_referencia)
    inicio = ref - pd.Timedelta(days=obs_dias)
    t = trans[(trans["fecha"] < ref) & (trans["fecha"] >= inicio)]
    if t.empty:
        return pd.DataFrame(columns=FEATURES + ["tienda_id"])

    compras = _a_compras(t)
    compras = compras[compras["monto"] > 0]
    g = compras.groupby("cliente_id")

    f = pd.DataFrame({
        "tienda_id": g["tienda_id"].first(),
        "ultima": g["fecha"].max(),
        "primera": g["fecha"].min(),
        "frecuencia": g.size().astype(float),
        "monetario": g["monto"].sum(),
    })
    f["recencia_dias"] = (ref - f["ultima"]).dt.total_seconds() / 86400.0
    f["antiguedad_dias"] = (ref - f["primera"]).dt.total_seconds() / 86400.0
    f["compras_por_mes"] = f["frecuencia"] / np.maximum(f["antiguedad_dias"] / 30.0, 1.0)

    for w in (30, 90):
        rec = compras[compras["fecha"] >= ref - pd.Timedelta(days=w)]
        f[f"compras_{w}d"] = rec.groupby("cliente_id").size().reindex(f.index).fillna(0).astype(float)
    previas = compras[(compras["fecha"] < ref - pd.Timedelta(days=90)) &
                      (compras["fecha"] >= ref - pd.Timedelta(days=180))]
    f["tendencia_90d"] = f["compras_90d"] - previas.groupby("cliente_id").size().reindex(f.index).fillna(0)

    # Intervalos entre compras (en días)
    orden = compras.sort_values(["cliente_id", "fecha"])
    gaps = orden.groupby("cliente_id")["fecha"].diff().dt.total_seconds() / 86400.0
    gaps = gaps.groupby(orden["cliente_id"])
    media = gaps.mean().reindex(f.index)
    desv = gaps.std().reindex(f.index)
    f["compra_unica"] = (f["frecuencia"] <= 1).astype(float)
    # Con una sola compra el ritmo es desconocido: se asume la ventana completa
    f["intercompra_media"] = media.fillna(float(obs_dias)).clip(lower=1.0)
    f["intercompra_cv"] = (desv / media.clip(lower=1.0)).fillna(0.0)
    f["ratio_recencia"] = f["recencia_dias"] / f["intercompra_media"]

    # Montos relativos a la tienda (independientes de la moneda)
    ticket = f["monetario"] / f["frecuencia"]
    ticket_tienda = compras.groupby("tienda_id")["monto"].median()
    gasto_tienda = f.groupby("tienda_id")["monetario"].median()
    f["log_ticket_relativo"] = np.log(ticket / f["tienda_id"].map(ticket_tienda).clip(lower=1e-9))
    f["log_monetario_relativo"] = np.log(f["monetario"] / f["tienda_id"].map(gasto_tienda).clip(lower=1e-9))

    f.index = f.index.astype(str)
    f.index.name = "cliente_id"
    return f[FEATURES + ["tienda_id"]].astype({c: float for c in FEATURES})


def construir_etiqueta(trans: pd.DataFrame, fecha_corte, ventana_prediccion_dias: int) -> pd.Series:
    """Etiqueta SIN fuga: churn = 1 si el cliente NO compra en [corte, corte + ventana).

    Usa únicamente compras posteriores (o iguales) al corte; las features usan solo
    compras anteriores. Ningún dato se comparte entre ambos lados del corte.
    Devuelve una Serie con los clientes que SÍ compraron en la ventana (valor 0);
    el resto se marca con 1 al unir con la población.
    """
    ref = pd.Timestamp(fecha_corte)
    fin = ref + pd.Timedelta(days=ventana_prediccion_dias)
    futuras = trans[(trans["fecha"] >= ref) & (trans["fecha"] < fin)]
    return pd.Series(0, index=futuras["cliente_id"].astype(str).unique(), name="churn")


def construir_snapshot(trans: pd.DataFrame, fecha_corte, ventana_prediccion_dias: int = 90,
                       obs_dias: int = VENTANA_OBSERVACION_DIAS) -> pd.DataFrame:
    """Features (pasado) + etiqueta (futuro) para una fecha de corte."""
    X = construir_features(trans, fecha_corte, obs_dias)
    compraron = construir_etiqueta(trans, fecha_corte, ventana_prediccion_dias)
    X["churn"] = (~X.index.isin(compraron.index)).astype(int)
    X["fecha_corte"] = pd.Timestamp(fecha_corte)
    return X.reset_index()


def construir_snapshots(trans: pd.DataFrame, cortes, ventana_prediccion_dias: int = 90,
                        obs_dias: int = VENTANA_OBSERVACION_DIAS) -> pd.DataFrame:
    """Apila varios cortes mensuales (el mismo cliente aparece una vez por corte)."""
    fin_datos = trans["fecha"].max()
    partes = []
    for c in cortes:
        c = pd.Timestamp(c)
        if c + pd.Timedelta(days=ventana_prediccion_dias) > fin_datos + pd.Timedelta(days=1):
            raise ValueError(f"El corte {c.date()} no tiene {ventana_prediccion_dias} días de futuro observado")
        partes.append(construir_snapshot(trans, c, ventana_prediccion_dias, obs_dias))
    return pd.concat(partes, ignore_index=True)
