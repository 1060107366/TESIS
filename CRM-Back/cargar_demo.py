"""
Carga datos de demostración realistas para probar los modelos de IA del CRM.

Uso (desde CRM-Back, con el entorno virtual activado y MySQL encendido):

    python cargar_demo.py                 # crea la tienda demo con 300 clientes
    python cargar_demo.py --reemplazar    # borra la tienda demo existente y la vuelve a crear
    python cargar_demo.py --clientes 500  # otro tamaño

Qué crea:
  * Un usuario (tienda) de demostración: email demo@tienda-demo.co, contraseña Demo2026*
  * 300 clientes con su historial REAL de compras, tomado de UCI Online Retail II
    (clientes reales anonimizados de un comercio del Reino Unido, licencia CC BY 4.0):
      - Se toman los últimos 18 meses de cada cliente, con sus fechas, frecuencias y montos reales.
      - Las fechas se desplazan para que la última fecha del dataset sea HOY. Así hay clientes
        activos, en pausa y perdidos, como en una tienda real.
      - Los montos se convierten a pesos con una escala que lleva el ticket mediano a
        ~45.000 COP (ticket típico de una MiPyME), conservando las proporciones reales.
      - Nombres, correos y teléfonos son FICTICIOS (las personas no existen).
  * Por cada cliente: interacción de creación + una interacción de compra por factura
    (con monto y fecha_compra), métricas, riesgo de abandono, segmento y recomendaciones.

Al final informa si los datos alcanzan para recalibrar el modelo de abandono
(flask churn-recalibrate necesita al menos 50 abandonos y 50 retenidos).
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

DATASET = BASE / "app" / "ia" / "datasets" / "online_retail_ii.csv.gz"
EMAIL_DEMO = "demo@tienda-demo.co"
USUARIO_DEMO = "tienda_demo"
CONTRASENA_DEMO = "Demo2026*"
DOMINIO_CLIENTES = "demo-crm.co"
MESES_HISTORIA = 18
TICKET_MEDIANO_COP = 45_000
SEMILLA = 42

NOMBRES = ["Ana", "Luis", "María", "Carlos", "Sandra", "Jorge", "Paola", "Andrés", "Diana", "Felipe", "Laura",
           "Camilo", "Gloria", "Héctor", "Lucía", "Mauricio", "Natalia", "Óscar", "Patricia", "Ricardo", "Sofía",
           "Tomás", "Valentina", "Wilson", "Yaneth", "Alejandro", "Beatriz", "Daniel", "Elena", "Fabio", "Gabriela",
           "Iván", "Juliana", "Kevin", "Liliana", "Manuel", "Nelly", "Orlando", "Pilar", "Rosa"]
APELLIDOS = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Muñoz", "Rojas", "Díaz", "Torres", "Vargas",
             "Castro", "Ortiz", "Ramírez", "Moreno", "Jiménez", "Hernández", "Pérez", "Mosquera", "Valencia",
             "Ararat", "Ulcué", "Yatacué", "Pito", "Campo", "Trochez", "Guetio", "Velasco", "Caicedo", "Ospina", "Zúñiga"]


def preparar_compras(n_clientes: int) -> pd.DataFrame:
    """Facturas reales de n clientes (muestra aleatoria reproducible), con fechas y montos ajustados."""
    if not DATASET.exists():
        sys.exit(f"No se encontró {DATASET}. Es el mismo dataset que usan los notebooks de churn_v2.")
    o = pd.read_csv(DATASET, dtype={"Invoice": str, "StockCode": str}, parse_dates=["InvoiceDate"])
    o = o.dropna(subset=["CustomerID"])
    o = o[~o["Invoice"].str.startswith("C") & (o["Quantity"] > 0) & (o["Price"] > 0) & (o["Country"] == "United Kingdom")]
    fin = o["InvoiceDate"].max()
    o = o[o["InvoiceDate"] >= fin - pd.DateOffset(months=MESES_HISTORIA)]
    facturas = (o.assign(monto=o["Quantity"] * o["Price"])
                 .groupby(["CustomerID", "Invoice"])
                 .agg(fecha=("InvoiceDate", "min"), monto=("monto", "sum"), productos=("StockCode", "nunique"))
                 .reset_index())
    ids = np.random.RandomState(SEMILLA).choice(facturas["CustomerID"].unique(), n_clientes, replace=False)
    f = facturas[facturas["CustomerID"].isin(ids)].copy()

    # Fechas: la última fecha del dataset pasa a ser hoy (desplazamiento en días completos)
    desplazamiento = pd.Timedelta(days=(pd.Timestamp(datetime.now()) - fin).days)
    f["fecha"] = (f["fecha"] + desplazamiento).dt.floor("s")
    # Montos: escala única para toda la tienda (conserva proporciones), redondeo a $100
    escala = TICKET_MEDIANO_COP / f["monto"].median()
    f["monto_cop"] = (f["monto"] * escala / 100).round().clip(lower=20).astype(int) * 100
    return f.sort_values(["CustomerID", "fecha"]).reset_index(drop=True)


def borrar_demo(db, User, Customer):
    u = User.query.filter_by(email=EMAIL_DEMO).first()
    if u is None:
        return False
    n = Customer.query.filter_by(usuario_id=u.id).count()
    Customer.query.filter_by(usuario_id=u.id).delete()   # interacciones, métricas, etc. se borran en cascada
    db.session.delete(u)
    db.session.commit()
    print(f"  Tienda demo anterior eliminada ({n} clientes)")
    return True


def main():
    ap = argparse.ArgumentParser(description="Carga la tienda de demostración del CRM")
    ap.add_argument("--clientes", type=int, default=300)
    ap.add_argument("--reemplazar", action="store_true", help="borra la tienda demo existente antes de cargar")
    a = ap.parse_args()

    from app import create_app, db
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.interacciones_cliente import InteraccionesCliente
    from app.models.segmento import Segmento
    from app.services.metrics_service import update_metrics
    from app.services.recommendation_service import generate_recommendations
    from app.ia.churn_v2 import servicio as churn
    from app.ia.churn_v2.features import construir_snapshot
    from app.ia.segmentacion import servicio as segmentacion

    app = create_app()
    with app.app_context():
        if User.query.filter_by(email=EMAIL_DEMO).first():
            if not a.reemplazar:
                sys.exit(f"Ya existe la tienda demo ({EMAIL_DEMO}). Use --reemplazar para volver a crearla.")
            borrar_demo(db, User, Customer)

        print(f"[1/5] Seleccionando {a.clientes} clientes reales de Online Retail II...")
        f = preparar_compras(a.clientes)
        print(f"      {len(f)} compras | {f.fecha.min():%Y-%m-%d} -> {f.fecha.max():%Y-%m-%d} | "
              f"ticket mediano ${int(f.monto_cop.median()):,} COP".replace(",", "."))

        print("[2/5] Creando la tienda y los clientes...")
        ahora = datetime.utcnow()
        usuario = User(usuario=USUARIO_DEMO, email=EMAIL_DEMO, creacion=ahora, actualizado=ahora)
        usuario.set_password(CONTRASENA_DEMO)
        db.session.add(usuario)
        db.session.flush()
        seg_inicial = 4 if db.session.get(Segmento, 4) else 1   # "Nuevo" hasta segmentar
        rng = np.random.RandomState(SEMILLA)
        clientes = []
        for k, (cid, g) in enumerate(f.groupby("CustomerID", sort=False), start=1):
            nombre, apellido = NOMBRES[rng.randint(len(NOMBRES))], APELLIDOS[rng.randint(len(APELLIDOS))]
            primera, ultima = g["fecha"].min().to_pydatetime(), g["fecha"].max().to_pydatetime()
            c = Customer(usuario_id=usuario.id, segmento_id=seg_inicial,
                         nombre=f"{nombre} {apellido}",
                         email=f"{nombre.lower()}.{apellido.lower()}{k:03d}@{DOMINIO_CLIENTES}"
                               .translate(str.maketrans("áéíóúñ", "aeioun")),
                         telefono=f"3{rng.randint(0, 3)}{rng.randint(0, 10)}{rng.randint(1000000, 9999999)}",
                         ultima_compra=ultima, total_compras=float(len(g)),
                         valor_medio_orden=float(g["monto_cop"].mean()), frecuencia_compra=0.0,
                         probabilidad_churn=None, valor_cliente=0.0,
                         fecha_creacion=primera, fecha_actualizacion=ultima)
            db.session.add(c)
            db.session.flush()
            db.session.add(InteraccionesCliente(
                cliente_id=c.id, usuario_id=usuario.id, tipo_interaccion_id=1, fecha_creacion=primera,
                data_interaccion={"accion": "Creación de cliente", "estado": "completado", "origen": "demo"}))
            for r in g.itertuples():
                fecha = r.fecha.to_pydatetime()
                db.session.add(InteraccionesCliente(
                    cliente_id=c.id, usuario_id=usuario.id, tipo_interaccion_id=2, fecha_creacion=fecha,
                    data_interaccion={"monto": int(r.monto_cop), "fecha_compra": fecha.strftime("%Y-%m-%d %H:%M:%S"),
                                      "productos": int(r.productos), "estado": "completado",
                                      "origen": "demo_online_retail_ii"}))
            clientes.append(c)
        db.session.commit()
        print(f"      {len(clientes)} clientes y {len(f) + len(clientes)} interacciones creadas")

        print("[3/5] Calculando métricas...")
        for c in clientes:
            update_metrics(c)

        print("[4/5] Riesgo de abandono, segmentos y recomendaciones (modelos v2)...")
        r_churn = churn.actualizar_probabilidades(usuario_id=usuario.id)
        r_seg = segmentacion.actualizar_segmentos(usuario_id=usuario.id)
        for c in clientes:
            generate_recommendations(c.id)

        print("[5/5] Resumen")
        niveles = pd.Series([v["nivel"] for v in churn.predecir(usuario_id=usuario.id).values()]).value_counts()
        print(f"      Riesgo de abandono: {niveles.to_dict()}  ({r_churn})")
        print(f"      Segmentos: {r_seg['por_segmento']}")
        trans, _ = churn.transacciones_desde_bd(usuario.id)
        corte = pd.Timestamp(datetime.utcnow()) - pd.Timedelta(days=91)
        snap = construir_snapshot(trans, corte.normalize(), 90)
        pos, neg = int(snap["churn"].sum()), int((1 - snap["churn"]).sum())
        listo = "SÍ" if min(pos, neg) >= 50 else "NO"
        print(f"      Recalibración posible con corte {corte:%Y-%m-%d}: {listo} ({pos} abandonos, {neg} retenidos)")
        print(f"\n✔ Tienda demo lista. Inicie sesión en el CRM con:\n"
              f"    email: {EMAIL_DEMO}\n    contraseña: {CONTRASENA_DEMO}")
        if listo == "SÍ":
            print(f"  Para probar la recalibración:  flask churn-recalibrate --corte {corte:%Y-%m-%d} --usuario {usuario.id}")


if __name__ == "__main__":
    main()
