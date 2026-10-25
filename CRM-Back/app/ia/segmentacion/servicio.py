"""
Servicio de segmentación de clientes (K-means RFM v2) para la API Flask.

El modelo se prepara y entrena en DataPrepare.ipynb y TrainModel.ipynb (esta carpeta).
Aquí solo se USA, con la misma función de variables (`churn_v2/features.py`) y las
mismas compras (`interacciones_cliente`, tipo 2) que el modelo de abandono.

Reglas además del modelo:
  * Cliente sin compras                        -> 4 "Nuevos"
  * Cliente sin compras en más de 365 días     -> 1 "Bajo valor"
  * Cliente con compras en el último año       -> K-means (1 Bajo, 2 Medio, 3 Alto valor)

El gasto se compara con el cliente típico de la MISMA tienda (usuario), por eso los
segmentos se calculan siempre sobre todos los clientes de la tienda.
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.ia.churn_v2.features import construir_features
from app.ia.churn_v2.servicio import transacciones_desde_bd

BASE = Path(__file__).resolve().parent
MODELOS_DIR = BASE / "modelos"
SEG_BAJO, SEG_NUEVOS = 1, 4

_cache: dict = {}


def ruta_modelo() -> Path:
    if os.getenv("SEGMENT_MODEL_PATH"):
        return Path(os.environ["SEGMENT_MODEL_PATH"])
    version = (MODELOS_DIR / "ACTUAL").read_text(encoding="utf-8").strip()
    return MODELOS_DIR / version / "modelo.pkl"


def cargar_artefacto() -> dict:
    ruta = ruta_modelo()
    clave = (str(ruta), ruta.stat().st_mtime)
    if _cache.get("clave") != clave:
        _cache["artefacto"] = joblib.load(ruta)
        _cache["clave"] = clave
    return _cache["artefacto"]


def nombres_segmentos() -> dict:
    """Nombres de la tabla `segmentos` (fuente única para API, dashboard y frontend).

    Si la tabla no está disponible se usan los nombres guardados en el modelo.
    """
    nombres = dict(cargar_artefacto()["segmentos"])
    try:
        from app.models.segmento import Segmento
        nombres.update({s.id: s.nombre for s in Segmento.query.all()})
    except Exception:
        pass
    return nombres


def _perfiles_con_nombres() -> dict:
    """Perfiles del modelo con el nombre del segmento tomado de la base de datos."""
    art, nombres = cargar_artefacto(), nombres_segmentos()
    out = {}
    for p in art["perfiles"]:
        viejo, nuevo = art["segmentos"][p["segmento_id"]], nombres.get(p["segmento_id"], p["segmento"])
        out[p["cluster"]] = {**p, "segmento": nuevo, "perfil": p["perfil"].replace(viejo, nuevo, 1)}
    return out


def info_modelo() -> dict:
    art = cargar_artefacto()
    return {"version": art["version"], "algoritmo": f"K-means (k={art['k']}) sobre RFM",
            "variables": art["variables"], "segmentos": nombres_segmentos(),
            "perfiles": list(_perfiles_con_nombres().values())}


def segmentar(usuario_id=None, cliente_ids=None, fecha_referencia=None) -> dict:
    """Segmento de cada cliente. Devuelve {cliente_id(int): resultado}."""
    art = cargar_artefacto()
    ref = pd.Timestamp(fecha_referencia or datetime.utcnow())
    trans, clientes = transacciones_desde_bd(usuario_id)
    if clientes.empty:
        return {}
    X = (construir_features(trans, ref, art["ventana_observacion_dias"]) if not trans.empty
         else pd.DataFrame(columns=art["variables"]))
    perfiles = _perfiles_con_nombres()
    nombres = nombres_segmentos()
    clusters = (pd.Series(art["pipeline"].predict(X[art["variables"]]), index=X.index)
                if len(X) else pd.Series(dtype=int))
    con_compras = set(trans["cliente_id"]) if not trans.empty else set()

    objetivo = clientes if cliente_ids is None else clientes[clientes["cliente_id"].isin({str(i) for i in cliente_ids})]
    res = {}
    for cid in objetivo["cliente_id"]:
        if cid in clusters.index:
            p = perfiles[int(clusters[cid])]
            fila = X.loc[cid]
            res[int(cid)] = {"segmento_id": p["segmento_id"], "segmento": p["segmento"], "perfil": p["perfil"],
                             "descripcion": p["descripcion"], "estado": "modelo",
                             "rfm": {"recencia_dias": round(float(fila["recencia_dias"]), 1),
                                     "compras_ultimo_anio": int(fila["frecuencia"]),
                                     "gasto_vs_tipico": round(float(np.exp(fila["log_monetario_relativo"])), 2)}}
        elif cid in con_compras:
            res[int(cid)] = {"segmento_id": SEG_BAJO, "segmento": nombres[SEG_BAJO], "perfil": "Inactivo",
                             "descripcion": f"Sin compras en más de {art['ventana_observacion_dias']} días",
                             "estado": "inactivo"}
        else:
            res[int(cid)] = {"segmento_id": SEG_NUEVOS, "segmento": nombres[SEG_NUEVOS], "perfil": "Nuevo",
                             "descripcion": "Cliente registrado sin compras todavía", "estado": "sin_historial"}
    return res


def actualizar_segmentos(usuario_id=None, cliente_ids=None) -> dict:
    """Asigna `clientes.segmento_id` con el modelo activo."""
    from app import db
    from app.models.customer import Customer
    from app.models.segmento import Segmento

    res = segmentar(usuario_id, cliente_ids)
    hay_nuevos = db.session.get(Segmento, SEG_NUEVOS) is not None
    conteo = {}
    for cid, r in res.items():
        seg = r["segmento_id"] if (r["segmento_id"] != SEG_NUEVOS or hay_nuevos) else SEG_BAJO
        cliente = db.session.get(Customer, cid)
        if cliente is not None:
            cliente.segmento_id = seg
        conteo[r["segmento"]] = conteo.get(r["segmento"], 0) + 1
    db.session.commit()
    return {"clientes": len(res), "por_segmento": conteo, "version_modelo": cargar_artefacto()["version"]}


def resumen_segmentos(usuario_id) -> list[dict]:
    """Perfil promedio de cada segmento para la tienda del usuario (para el dashboard)."""
    res = segmentar(usuario_id)
    filas = [{"segmento_id": r["segmento_id"], "segmento": r["segmento"], **r.get("rfm", {})} for r in res.values()]
    if not filas:
        return []
    df = pd.DataFrame(filas)
    agg = df.groupby(["segmento_id", "segmento"]).agg(clientes=("segmento", "size"))
    for col in ("recencia_dias", "compras_ultimo_anio", "gasto_vs_tipico"):
        if col in df:
            agg[f"{col}_promedio"] = df.groupby(["segmento_id", "segmento"])[col].mean().round(2)
    return agg.reset_index().replace({np.nan: None}).to_dict(orient="records")
