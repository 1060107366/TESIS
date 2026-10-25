"""
Servicio de predicción de abandono v2 para la API Flask.

El modelo se prepara y entrena en los notebooks DataPrepare.ipynb y TrainModel.ipynb.
Este archivo solo lo USA desde la API, con EXACTAMENTE la misma función de
variables que los notebooks (`features.construir_features`), alimentada con las
compras registradas en `interacciones_cliente` (tipo 2 = compra).

Estados posibles de un cliente:
  * "modelo"         -> tiene compras en los últimos 365 días: lo puntúa el modelo.
  * "inactivo"       -> su última compra tiene más de 365 días: ya abandonó (prob. 1,0).
  * "sin_historial"  -> nunca ha comprado: el modelo no aplica (arranque en frío);
                        la app debe aplicar una regla de negocio (p. ej. contactar a los 30 días).
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .features import FEATURES, construir_features, construir_snapshot

BASE = Path(__file__).resolve().parent
MODELOS_DIR = BASE / "modelos"
TIPO_COMPRA = 2

_cache: dict = {}


# ------------------------------------------------------------------ artefacto
def ruta_modelo() -> Path:
    if os.getenv("CHURN_MODEL_PATH"):
        return Path(os.environ["CHURN_MODEL_PATH"])
    version = (MODELOS_DIR / "ACTUAL").read_text(encoding="utf-8").strip()
    return MODELOS_DIR / version / "modelo.pkl"


def cargar_artefacto() -> dict:
    """Carga el modelo una sola vez (y de nuevo solo si el archivo cambia)."""
    ruta = ruta_modelo()
    clave = (str(ruta), ruta.stat().st_mtime)
    if _cache.get("clave") != clave:
        _cache["artefacto"] = joblib.load(ruta)
        _cache["clave"] = clave
    return _cache["artefacto"]


def info_modelo() -> dict:
    art = cargar_artefacto()
    ruta = ruta_modelo()
    met = ruta.parent / "metricas.json"
    resumen = {}
    if met.exists():
        m = json.loads(met.read_text(encoding="utf-8"))
        t = m["resultados"][m["campeon"]]["test"]
        resumen = {"fuente": m["fuente"], "definicion_etiqueta": m["definicion_etiqueta"],
                   "roc_auc_test": round(t["roc_auc"], 3), "pr_auc_test": round(t["pr_auc"], 3),
                   "brier_test": round(t["brier"], 3), "fecha_entrenamiento": m["fecha_entrenamiento"]}
    return {"version": art["version"], "algoritmo": art["campeon"],
            "ventana_prediccion_dias": art["ventana_prediccion_dias"],
            "umbrales": art["umbrales"], **resumen}


# ------------------------------------------------------------------ datos de la BD
def _leer_json(valor) -> dict:
    if isinstance(valor, dict):
        return valor
    try:
        return json.loads(valor) if valor else {}
    except (TypeError, ValueError):
        return {}


def _parsear_fecha(valor):
    if not valor:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(valor)[:19], fmt)
        except ValueError:
            continue
    return None


def transacciones_desde_bd(usuario_id=None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Devuelve (transacciones, clientes) con el contrato de `datos.py`.

    - La fecha de la compra es `data_interaccion.fecha_compra` si existe; si no,
      la fecha de creación de la interacción.
    - tienda_id = usuario dueño del cliente (cada MiPyME es una tienda): los montos
      se normalizan contra la mediana de SU tienda.
    - Clientes con compras agregadas pero sin interacciones de compra (datos de
      semilla antiguos) obtienen un historial reconstruido: `total_compras` compras
      repartidas entre la creación y la última compra, por `valor_medio_orden`.
    """
    from app.models.customer import Customer
    from app.models.interacciones_cliente import InteraccionesCliente

    qc = Customer.query
    if usuario_id is not None:
        qc = qc.filter(Customer.usuario_id == int(usuario_id))
    clientes = pd.DataFrame([{
        "cliente_id": str(c.id), "tienda_id": str(c.usuario_id), "fecha_creacion": c.fecha_creacion,
        "ultima_compra": c.ultima_compra, "total_compras": c.total_compras or 0,
        "valor_medio_orden": c.valor_medio_orden or 0.0,
    } for c in qc.all()], columns=["cliente_id", "tienda_id", "fecha_creacion", "ultima_compra",
                                   "total_compras", "valor_medio_orden"])
    if clientes.empty:
        return pd.DataFrame(columns=["cliente_id", "factura_id", "fecha", "monto", "tienda_id"]), clientes

    ids = [int(i) for i in clientes["cliente_id"]]
    filas = []
    for it in (InteraccionesCliente.query
               .filter(InteraccionesCliente.tipo_interaccion_id == TIPO_COMPRA,
                       InteraccionesCliente.cliente_id.in_(ids)).all()):
        d = _leer_json(it.data_interaccion)
        try:
            monto = float(d.get("monto", 0) or 0)
        except (TypeError, ValueError):
            monto = 0.0
        if monto <= 0:
            continue
        filas.append({"cliente_id": str(it.cliente_id), "factura_id": f"int_{it.id}",
                      "fecha": _parsear_fecha(d.get("fecha_compra")) or it.fecha_creacion,
                      "monto": monto})
    trans = pd.DataFrame(filas, columns=["cliente_id", "factura_id", "fecha", "monto"])

    # Reconstrucción para clientes sin interacciones de compra
    con_trans = set(trans["cliente_id"])
    extra = []
    for c in clientes.itertuples():
        n = int(round(c.total_compras))
        if c.cliente_id in con_trans or n < 1 or c.ultima_compra is None:
            continue
        inicio = c.fecha_creacion or c.ultima_compra
        for k, f in enumerate(pd.date_range(min(inicio, c.ultima_compra), c.ultima_compra, periods=n).round("s")):
            extra.append({"cliente_id": c.cliente_id, "factura_id": f"rec_{c.cliente_id}_{k}",
                          "fecha": f.to_pydatetime(), "monto": float(c.valor_medio_orden) or 1.0})
    if extra:
        trans = pd.concat([trans, pd.DataFrame(extra)], ignore_index=True)

    trans["tienda_id"] = trans["cliente_id"].map(clientes.set_index("cliente_id")["tienda_id"])
    trans["fecha"] = pd.to_datetime(trans["fecha"])
    return trans, clientes


# ------------------------------------------------------------------ predicción
def nivel_riesgo(p, umbrales) -> str:
    if p is None:
        return "desconocido"
    return "alto" if p >= umbrales["alto"] else ("medio" if p >= umbrales["medio"] else "bajo")


def explicar(fila: pd.Series) -> list[str]:
    """Razones legibles para el dueño de la MiPyME (basadas en las mismas features)."""
    r = []
    if fila["compra_unica"] >= 1:
        r.append("Solo ha comprado una vez en el último año")
    elif fila["ratio_recencia"] >= 1.5:
        r.append(f"Suele comprar cada {fila['intercompra_media']:.0f} días y ya lleva "
                 f"{fila['recencia_dias']:.0f} sin venir")
    if fila["compras_90d"] == 0:
        r.append("No ha comprado en los últimos 90 días")
    if fila["tendencia_90d"] < 0:
        r.append("Compra menos que en el trimestre anterior")
    if fila["log_monetario_relativo"] < np.log(0.5):
        r.append("Su gasto anual es menos de la mitad del cliente típico de la tienda")
    if not r and fila["frecuencia"] >= 3 and fila["ratio_recencia"] < 1:
        r.append("Compra con regularidad y está dentro de su ritmo habitual")
    return r


def predecir(usuario_id=None, cliente_ids=None, fecha_referencia=None) -> dict:
    """Probabilidad de abandono por cliente. Devuelve {cliente_id(int): resultado}."""
    art = cargar_artefacto()
    ref = pd.Timestamp(fecha_referencia or datetime.utcnow())
    obs = art["ventana_observacion_dias"]
    trans, clientes = transacciones_desde_bd(usuario_id)
    if clientes.empty:
        return {}

    # Features de TODA la tienda (para normalizar montos), luego se filtra
    X = construir_features(trans, ref, obs) if not trans.empty else pd.DataFrame(columns=FEATURES)
    probs = pd.Series(art["modelo"].predict_proba(X[FEATURES])[:, 1], index=X.index) if len(X) else pd.Series(dtype=float)

    objetivo = clientes if cliente_ids is None else clientes[clientes["cliente_id"].isin({str(i) for i in cliente_ids})]
    ultima = trans.groupby("cliente_id")["fecha"].max() if not trans.empty else pd.Series(dtype="datetime64[ns]")
    res = {}
    for c in objetivo.itertuples():
        cid = c.cliente_id
        base = {"version_modelo": art["version"], "fecha_referencia": ref.isoformat()}
        if cid in probs.index:
            p = float(probs[cid])
            fila = X.loc[cid]
            res[int(cid)] = {**base, "estado": "modelo", "probabilidad": round(p, 4),
                             "nivel": nivel_riesgo(p, art["umbrales"]), "razones": explicar(fila),
                             "features": {k: round(float(fila[k]), 4) for k in FEATURES}}
        elif cid in ultima.index:
            res[int(cid)] = {**base, "estado": "inactivo", "probabilidad": 1.0, "nivel": "alto",
                             "razones": [f"Sin compras en más de {obs} días"]}
        else:
            res[int(cid)] = {**base, "estado": "sin_historial", "probabilidad": None,
                             "nivel": "desconocido",
                             "razones": ["Cliente sin compras: aplicar seguimiento de bienvenida"]}
    return res


def actualizar_probabilidades(usuario_id=None, cliente_ids=None, guardar_historial=True) -> dict:
    """Predice y guarda `clientes.probabilidad_churn` + historial en `predicciones`."""
    from app import db
    from app.models.customer import Customer
    from app.models.predicciones import Prediccion

    res = predecir(usuario_id, cliente_ids)
    conteo = {"modelo": 0, "inactivo": 0, "sin_historial": 0}
    ahora = datetime.utcnow()
    for cid, r in res.items():
        conteo[r["estado"]] += 1
        cliente = db.session.get(Customer, cid)
        if cliente is None:
            continue
        # Sin historial de compras: el modelo no aplica y el riesgo queda vacío (NULL)
        cliente.probabilidad_churn = r["probabilidad"]
        if guardar_historial:
            db.session.add(Prediccion(
                cliente_id=cid, tipo_prediccion="Probabilidad de Churn",
                valor_prediccion={k: r[k] for k in ("probabilidad", "nivel", "estado", "razones",
                                                    "version_modelo", "fecha_referencia")},
                fecha_creacion=ahora, fecha_actualizacion=ahora))
    db.session.commit()
    return {"clientes": len(res), **conteo, "version_modelo": cargar_artefacto()["version"]}


# ------------------------------------------------------------------ monitoreo y recalibración
def monitorear(usuario_id=None) -> dict:
    """PSI de las features y de las probabilidades actuales frente al entrenamiento."""
    art = cargar_artefacto()
    trans, _ = transacciones_desde_bd(usuario_id)
    if trans.empty:
        return {"estado": "sin_datos"}
    X = construir_features(trans, datetime.utcnow(), art["ventana_observacion_dias"])
    if X.empty:
        return {"estado": "sin_datos"}
    p = art["modelo"].predict_proba(X[FEATURES])[:, 1]
    return {"clientes_evaluados": int(len(X)), "version_modelo": art["version"],
            "psi": _reporte_psi(art["referencias_psi"], X, p)}


def _psi(ref: dict, valores) -> float:
    """Population Stability Index frente a la distribución de entrenamiento (deciles)."""
    v = np.asarray(pd.Series(valores).dropna(), dtype=float)
    if len(v) == 0:
        return float("nan")
    cortes = np.asarray(ref["cortes"])
    esperado = np.clip(np.asarray(ref["proporciones"]), 1e-4, None)
    actual = np.bincount(np.searchsorted(cortes, v, side="right"), minlength=len(cortes) + 1) / len(v)
    actual = np.clip(actual, 1e-4, None)
    return float(np.sum((actual - esperado) * np.log(actual / esperado)))


def _reporte_psi(referencias: dict, X: pd.DataFrame, probabilidades) -> dict:
    """PSI < 0,10 estable; 0,10-0,25 vigilar; > 0,25 investigar / recalibrar."""
    out = {}
    for col, ref in referencias.items():
        valor = _psi(ref, probabilidades if col == "probabilidad" else X[col])
        estado = ("sin_datos" if np.isnan(valor) else
                  "estable" if valor < 0.10 else "vigilar" if valor < 0.25 else "reentrenar")
        out[col] = {"psi": round(valor, 4), "estado": estado}
    return out


def _metricas(y, p) -> dict:
    from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
    return {"n": int(len(y)), "prevalencia": float(np.mean(y)), "roc_auc": float(roc_auc_score(y, p)),
            "pr_auc": float(average_precision_score(y, p)), "brier": float(brier_score_loss(y, p))}


def recalibrar_con_bd(fecha_corte, min_por_clase: int = 50, usuario_id=None) -> dict:
    """Recalibra las probabilidades con datos locales (piloto en MiPyMEs).

    No reentrena el modelo: conserva el ordenamiento aprendido y ajusta la escala de
    probabilidad al comportamiento real de los clientes locales. Requiere que la ventana
    de predicción posterior a `fecha_corte` ya haya terminado.
    """
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.frozen import FrozenEstimator

    art = cargar_artefacto()
    ventana, obs = art["ventana_prediccion_dias"], art["ventana_observacion_dias"]
    corte = pd.Timestamp(fecha_corte)
    if corte + pd.Timedelta(days=ventana) > pd.Timestamp(datetime.utcnow()):
        return {"ok": False, "error": f"La ventana de {ventana} días posterior al corte aún no termina."}
    trans, _ = transacciones_desde_bd(usuario_id)
    snap = construir_snapshot(trans, corte, ventana, obs)
    pos, neg = int(snap["churn"].sum()), int((1 - snap["churn"]).sum())
    if min(pos, neg) < min_por_clase:
        return {"ok": False, "error": f"Datos insuficientes: {pos} abandonos y {neg} retenidos "
                                      f"(se requieren al menos {min_por_clase} de cada clase)."}
    antes = _metricas(snap["churn"], art["modelo"].predict_proba(snap[FEATURES])[:, 1])
    nuevo = CalibratedClassifierCV(FrozenEstimator(art["modelo"]), method="sigmoid").fit(snap[FEATURES], snap["churn"])
    despues = _metricas(snap["churn"], nuevo.predict_proba(snap[FEATURES])[:, 1])
    version = f"{art['version']}-local-{corte:%Y%m%d}"
    salida = MODELOS_DIR / f"v{version}"
    salida.mkdir(parents=True, exist_ok=True)
    joblib.dump({**art, "modelo": nuevo, "version": version, "recalibrado_con": str(corte.date())},
                salida / "modelo.pkl", compress=3)
    (salida / "recalibracion.json").write_text(json.dumps(
        {"corte": str(corte.date()), "antes": antes, "despues": despues}, indent=2, ensure_ascii=False),
        encoding="utf-8")
    return {"ok": True, "version": version, "ruta": str(salida),
            "brier_antes": antes["brier"], "brier_despues": despues["brier"],
            "nota": "Para activarla, escriba la versión en modelos/ACTUAL si el Brier mejora."}
