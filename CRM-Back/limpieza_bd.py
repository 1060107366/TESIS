"""
Limpieza de la base de datos del CRM con respaldo previo.

Uso (desde CRM-Back, con el entorno virtual activado y MySQL encendido):

    python limpieza_bd.py              # SIMULACIÓN: muestra qué haría, no cambia nada
    python limpieza_bd.py --ejecutar   # respaldo completo + limpieza + restricciones

Qué hace con --ejecutar:
  1. RESPALDO: copia todas las tablas a una base nueva `<bd>_respaldo_AAAAMMDD_HHMM`
     y verifica que cada tabla tenga el mismo número de filas. Si algo no cuadra, se detiene.
  2. DATOS (en una transacción):
     - Elimina los 1.500 clientes de prueba de la carga masiva del 15/10/2026
       (sus interacciones, métricas, predicciones y recomendaciones se borran en cascada).
     - Elimina métricas y recomendaciones duplicadas (conserva la más reciente).
     - Elimina del catálogo las recomendaciones basura (tipo = solo un número).
     - Elimina predicciones antiguas con JSON guardado como texto.
     - Clientes sin compras: segmento 4 "Nuevo" y riesgo vacío.
  3. ESTRUCTURA:
     - Borra las tablas backup_metricas_historicas_* (quedan en el respaldo).
     - Borra las columnas viejas clientes.churn y clientes.churn_value.
     - Agrega restricciones únicas: correo por tienda en clientes; correo y usuario en
       usuario; (cliente, métrica, periodo) en métricas; (cliente, catálogo) en recomendaciones.
     - Borrar un segmento ya NO borra sus clientes (ON DELETE SET NULL).
  4. Recalcula riesgo de abandono y segmento de los clientes que quedan.

Restaurar el respaldo (en MySQL Workbench), si fuera necesario:
    Ver el archivo respaldo_<fecha>_RESTAURAR.sql que este script deja en CRM-Back.
"""
import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE = Path(__file__).resolve().parent
LOTE_PRUEBA = ("2026-10-15 16:35:00", "2026-10-15 16:38:59")   # carga masiva ejecutada dos veces
CLIENTES_PRUEBA_ESPERADOS = 1500
TIPO_COMPRA = 2
SEG_NUEVO = 4

SQL_CLIENTES_PRUEBA = f"""
    SELECT c.id FROM clientes c
    WHERE c.fecha_creacion BETWEEN :ini AND :fin
      AND c.total_compras = 0
      AND NOT EXISTS (SELECT 1 FROM interacciones_cliente i
                      WHERE i.cliente_id = c.id AND i.tipo_interaccion_id = {TIPO_COMPRA})
"""
SQL_METRICAS_DUP = """
    SELECT DISTINCT m1.id FROM metricas_historicas m1
    JOIN metricas_historicas m2
      ON m1.cliente_id = m2.cliente_id AND m1.tipo_metrica = m2.tipo_metrica
     AND m1.periodo = m2.periodo AND m1.id < m2.id
"""
SQL_RECOS_DUP = """
    SELECT DISTINCT r1.id FROM recomendaciones r1
    JOIN recomendaciones r2
      ON r1.cliente_id = r2.cliente_id AND r1.catalogo_recomendacion_id = r2.catalogo_recomendacion_id
     AND r1.id < r2.id
"""
SQL_CATALOGO_BASURA = "SELECT id FROM catalogo_recomendaciones WHERE tipo_recomendacion REGEXP '^[0-9]+$'"
SQL_PREDICCIONES_TEXTO = "SELECT id FROM predicciones WHERE JSON_TYPE(valor_prediccion) = 'STRING'"
SQL_SIN_COMPRAS = f"""
    SELECT c.id FROM clientes c
    WHERE c.total_compras = 0
      AND NOT EXISTS (SELECT 1 FROM interacciones_cliente i
                      WHERE i.cliente_id = c.id AND i.tipo_interaccion_id = {TIPO_COMPRA})
"""

UNICOS = [  # (tabla, nombre, columnas para el índice, columnas para buscar duplicados)
    ("clientes", "uq_clientes_usuario_email", "usuario_id, email", "usuario_id, email"),
    ("usuario", "uq_usuario_email", "email", "email"),
    ("usuario", "uq_usuario_usuario", "usuario", "usuario"),
    ("metricas_historicas", "uq_metricas_cliente_tipo_periodo", "cliente_id, tipo_metrica(100), periodo(50)",
     "cliente_id, tipo_metrica, periodo"),
    ("recomendaciones", "uq_recomendaciones_cliente_catalogo", "cliente_id, catalogo_recomendacion_id",
     "cliente_id, catalogo_recomendacion_id"),
]


def ids(cx, sql, **p):
    return [r[0] for r in cx.execute(text(sql), p).fetchall()]


def lista(xs):
    return ", ".join(str(int(x)) for x in xs) or "NULL"


def existe(cx, sql, **p):
    return cx.execute(text(sql), p).scalar() > 0


def diagnostico(cx, bd):
    d = {
        "clientes_prueba": ids(cx, SQL_CLIENTES_PRUEBA, ini=LOTE_PRUEBA[0], fin=LOTE_PRUEBA[1]),
        "metricas_duplicadas": ids(cx, SQL_METRICAS_DUP),
        "recomendaciones_duplicadas": ids(cx, SQL_RECOS_DUP),
        "catalogo_basura": ids(cx, SQL_CATALOGO_BASURA),
        "predicciones_texto": ids(cx, SQL_PREDICCIONES_TEXTO),
        "tablas_backup": [r[0] for r in cx.execute(text(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=:bd AND TABLE_NAME LIKE 'backup\\_%'"),
            {"bd": bd})],
        "columnas_viejas": [r[0] for r in cx.execute(text(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:bd AND TABLE_NAME='clientes' "
            "AND COLUMN_NAME IN ('churn','churn_value')"), {"bd": bd})],
    }
    total = cx.execute(text("SELECT COUNT(*) FROM clientes")).scalar()
    print(f"\nBase de datos: {bd}  |  clientes actuales: {total}")
    print(f"  Clientes de prueba (carga del 15/10) a eliminar : {len(d['clientes_prueba'])}"
          f"  (se esperaban {CLIENTES_PRUEBA_ESPERADOS})")
    print(f"  Clientes que quedarán                           : {total - len(d['clientes_prueba'])}")
    print(f"  Métricas duplicadas a eliminar                  : {len(d['metricas_duplicadas'])}")
    print(f"  Recomendaciones duplicadas a eliminar           : {len(d['recomendaciones_duplicadas'])}")
    print(f"  Filas basura del catálogo a eliminar            : {len(d['catalogo_basura'])}  ids={d['catalogo_basura']}")
    print(f"  Predicciones con JSON como texto a eliminar     : {len(d['predicciones_texto'])}")
    print(f"  Tablas de backup a borrar                       : {d['tablas_backup']}")
    print(f"  Columnas viejas a borrar en clientes            : {d['columnas_viejas']}")
    return d


def respaldar(engine, bd):
    destino = f"{bd}_respaldo_{datetime.now():%Y%m%d_%H%M%S}"
    with engine.connect() as cx:
        tablas = [r[0] for r in cx.execute(text(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=:bd AND TABLE_TYPE='BASE TABLE'"),
            {"bd": bd})]
        collation = cx.execute(text("SELECT @@collation_database")).scalar()
        # Definición original completa (con llaves foráneas) para poder restaurar tal cual
        definiciones = {t: cx.execute(text(f"SHOW CREATE TABLE `{bd}`.`{t}`")).fetchone()[1] for t in tablas}
        cx.execute(text(f"CREATE DATABASE `{destino}` CHARACTER SET utf8mb4 COLLATE {collation}"))
        for t in tablas:
            cx.execute(text(f"CREATE TABLE `{destino}`.`{t}` LIKE `{bd}`.`{t}`"))
            cx.execute(text(f"INSERT INTO `{destino}`.`{t}` SELECT * FROM `{bd}`.`{t}`"))
            a = cx.execute(text(f"SELECT COUNT(*) FROM `{bd}`.`{t}`")).scalar()
            b = cx.execute(text(f"SELECT COUNT(*) FROM `{destino}`.`{t}`")).scalar()
            if a != b:
                raise RuntimeError(f"El respaldo de {t} no cuadra ({a} vs {b}). No se hizo ningún cambio.")
            print(f"  respaldo {t:40s} {b:>7} filas ✔")
        cx.commit()
    restaurar = BASE / f"respaldo_{destino[len(bd) + 10:]}_RESTAURAR.sql"
    restaurar.write_text(
        f"-- Restaura `{bd}` exactamente como estaba antes de la limpieza (estructura, llaves foráneas y datos)\n"
        f"-- usando la copia `{destino}`. Ejecutar completo en MySQL Workbench.\n"
        f"USE `{bd}`;\nSET FOREIGN_KEY_CHECKS = 0;\n"
        + "".join(f"\nDROP TABLE IF EXISTS `{t}`;\n{definiciones[t]};\n"
                  f"INSERT INTO `{t}` SELECT * FROM `{destino}`.`{t}`;\n" for t in tablas)
        + "\nSET FOREIGN_KEY_CHECKS = 1;\n",
        encoding="utf-8")
    print(f"\n✔ Respaldo completo en la base `{destino}`. Instrucciones de restauración: {restaurar.name}")
    return destino


def limpiar_datos(engine, d):
    with engine.begin() as cx:   # una sola transacción: o se aplica todo o nada
        n = {}
        n["clientes_prueba"] = cx.execute(text(f"DELETE FROM clientes WHERE id IN ({lista(d['clientes_prueba'])})")).rowcount
        n["metricas_duplicadas"] = cx.execute(text(f"DELETE FROM metricas_historicas WHERE id IN ({lista(ids(cx, SQL_METRICAS_DUP))})")).rowcount
        n["catalogo_basura"] = cx.execute(text(f"DELETE FROM catalogo_recomendaciones WHERE id IN ({lista(d['catalogo_basura'])})")).rowcount
        n["recomendaciones_duplicadas"] = cx.execute(text(f"DELETE FROM recomendaciones WHERE id IN ({lista(ids(cx, SQL_RECOS_DUP))})")).rowcount
        n["predicciones_texto"] = cx.execute(text(f"DELETE FROM predicciones WHERE id IN ({lista(ids(cx, SQL_PREDICCIONES_TEXTO))})")).rowcount
        sin = ids(cx, SQL_SIN_COMPRAS)
        if existe(cx, "SELECT COUNT(*) FROM segmentos WHERE id = :s", s=SEG_NUEVO):
            n["clientes_sin_compras_a_nuevo"] = cx.execute(text(
                f"UPDATE clientes SET segmento_id = {SEG_NUEVO}, probabilidad_churn = NULL WHERE id IN ({lista(sin)})")).rowcount
    for k, v in n.items():
        print(f"  {k:32s} {v:>6}")


def ajustar_estructura(engine, bd):
    with engine.connect() as cx:
        for t in [r[0] for r in cx.execute(text(
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=:bd AND TABLE_NAME LIKE 'backup\\_%'"),
                {"bd": bd})]:
            cx.execute(text(f"DROP TABLE `{t}`"))
            print(f"  tabla {t} borrada")
        for col in ("churn", "churn_value"):
            if existe(cx, "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:bd "
                          "AND TABLE_NAME='clientes' AND COLUMN_NAME=:c", bd=bd, c=col):
                cx.execute(text(f"ALTER TABLE clientes DROP COLUMN `{col}`"))
                print(f"  columna clientes.{col} borrada")
        for tabla, nombre, cols_idx, cols_dup in UNICOS:
            if existe(cx, "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=:bd "
                          "AND TABLE_NAME=:t AND INDEX_NAME=:i", bd=bd, t=tabla, i=nombre):
                print(f"  {nombre} ya existía")
                continue
            dups = cx.execute(text(f"SELECT COUNT(*) FROM (SELECT {cols_dup} FROM `{tabla}` GROUP BY {cols_dup} "
                                   f"HAVING COUNT(*) > 1) x")).scalar()
            if dups:
                print(f"  ⚠ {nombre} NO se creó: hay {dups} grupos duplicados en {tabla} (revisar a mano)")
                continue
            cx.execute(text(f"ALTER TABLE `{tabla}` ADD UNIQUE KEY `{nombre}` ({cols_idx})"))
            print(f"  restricción única {nombre} creada")
        regla = cx.execute(text("SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS "
                                "WHERE CONSTRAINT_SCHEMA=:bd AND CONSTRAINT_NAME='FK_Cliente_Segmento'"),
                           {"bd": bd}).scalar()
        if regla and regla != "SET NULL":
            cx.execute(text("ALTER TABLE clientes DROP FOREIGN KEY FK_Cliente_Segmento"))
            cx.execute(text("ALTER TABLE clientes ADD CONSTRAINT FK_Cliente_Segmento FOREIGN KEY (segmento_id) "
                            "REFERENCES segmentos (id) ON DELETE SET NULL"))
            print(f"  FK_Cliente_Segmento: ON DELETE {regla} -> SET NULL")
        cx.commit()


def recalcular_modelos():
    """Riesgo de abandono y segmento de los clientes que quedan (modelos v2)."""
    sys.path.insert(0, str(BASE))
    from app import create_app
    from app.ia.churn_v2 import servicio as churn
    from app.ia.segmentacion import servicio as segmentacion
    app = create_app()
    with app.app_context():
        print("  abandono    :", churn.actualizar_probabilidades())
        print("  segmentación:", segmentacion.actualizar_segmentos())


def main():
    ap = argparse.ArgumentParser(description="Limpieza de la base de datos del CRM")
    ap.add_argument("--ejecutar", action="store_true", help="aplica los cambios (sin esto solo simula)")
    ap.add_argument("--forzar", action="store_true",
                    help=f"continúa aunque los clientes de prueba no sean exactamente {CLIENTES_PRUEBA_ESPERADOS}")
    a = ap.parse_args()

    load_dotenv(BASE / ".env")
    engine = create_engine(os.environ["DATABASE_URL"])
    with engine.connect() as cx:
        bd = cx.execute(text("SELECT DATABASE()")).scalar()
        d = diagnostico(cx, bd)

    if not a.ejecutar:
        print("\nSIMULACIÓN: no se cambió nada. Para aplicar:  python limpieza_bd.py --ejecutar")
        return
    if len(d["clientes_prueba"]) != CLIENTES_PRUEBA_ESPERADOS and not a.forzar:
        print(f"\n✘ Se encontraron {len(d['clientes_prueba'])} clientes de prueba y se esperaban "
              f"{CLIENTES_PRUEBA_ESPERADOS}. No se hizo nada. Revise o use --forzar.")
        return

    print("\n[1/4] Respaldo...")
    respaldar(engine, bd)
    print("\n[2/4] Limpieza de datos (una transacción)...")
    limpiar_datos(engine, d)
    print("\n[3/4] Estructura...")
    ajustar_estructura(engine, bd)
    print("\n[4/4] Recalculando riesgo y segmentos con los modelos v2...")
    try:
        recalcular_modelos()
    except Exception as e:   # la limpieza ya quedó aplicada; esto se puede repetir con los comandos flask
        print(f"  ⚠ No se pudo recalcular ({e}). Ejecute: flask churn-predict  y  flask update-segments")
    with engine.connect() as cx:
        print("\nFilas finales por tabla:")
        for t in ("usuario", "clientes", "interacciones_cliente", "metricas_historicas", "predicciones",
                  "recomendaciones", "catalogo_recomendaciones", "segmentos", "tipos_interaccion"):
            print(f"  {t:28s} {cx.execute(text(f'SELECT COUNT(*) FROM `{t}`')).scalar():>6}")
    print("\n✔ Limpieza terminada.")


if __name__ == "__main__":
    main()
