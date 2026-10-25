"""
Exporta la estructura y los datos de la base de datos MySQL del CRM para analizarla.

Uso (desde la carpeta CRM-Back, con el entorno virtual activado):
    python exportar_bd.py

- Lee DATABASE_URL del archivo .env (las credenciales no se copian a la exportación).
- Enmascara datos personales: nombres, correos, teléfonos, contraseñas y usuarios se
  reemplazan por un código (hash) que conserva la unicidad pero no el valor real.
- Genera la carpeta CRM-Back/exportacion_bd/ con:
    servidor.json, tablas.csv, columnas.csv, llaves_foraneas.csv, indices.csv,
    create_tables.sql y datos/<tabla>.csv.gz
- Esta carpeta contiene datos: no la suba a GitHub (ya está en .gitignore) y bórrela
  cuando termine el análisis.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

MAX_FILAS = 200_000
SALIDA = Path(__file__).resolve().parent / "exportacion_bd"
PII_SIEMPRE = ("email", "correo", "telefono", "celular", "contrasena", "password")   # en cualquier tabla o JSON
PII_PERSONAS = ("nombre", "usuario", "apellido")          # solo en tablas de personas y en JSON
TABLAS_PERSONAS = {"clientes", "usuario"}
SAL = os.urandom(8).hex()   # sal aleatoria: los códigos no se pueden revertir


def es_pii(col: str, tabla: str | None = None) -> bool:
    """tabla=None -> clave dentro de un JSON."""
    c = col.lower()
    if c == "id" or c.endswith("_id"):
        return False
    if any(p in c for p in PII_SIEMPRE):
        return True
    return (tabla is None or tabla in TABLAS_PERSONAS) and any(p in c for p in PII_PERSONAS)


def enmascarar(valor):
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    return "h_" + hashlib.sha256((SAL + str(valor)).encode()).hexdigest()[:10]


def enmascarar_json(valor):
    """Enmascara claves personales dentro de columnas JSON (p. ej. data_interaccion)."""
    def rec(x):
        if isinstance(x, dict):
            return {k: (enmascarar(v) if es_pii(k) and not isinstance(v, (dict, list)) else rec(v)) for k, v in x.items()}
        if isinstance(x, list):
            return [rec(v) for v in x]
        return x
    if valor is None:
        return None
    try:
        obj = json.loads(valor) if isinstance(valor, (str, bytes)) else valor
    except (TypeError, ValueError):
        return valor
    return json.dumps(rec(obj), ensure_ascii=False, default=str)


def main():
    load_dotenv(Path(__file__).resolve().parent / ".env")
    engine = create_engine(os.environ["DATABASE_URL"])
    SALIDA.mkdir(exist_ok=True)
    (SALIDA / "datos").mkdir(exist_ok=True)

    with engine.connect() as cx:
        bd = cx.execute(text("SELECT DATABASE()")).scalar()
        servidor = {
            "base_de_datos": bd,
            "version_mysql": cx.execute(text("SELECT VERSION()")).scalar(),
            "sql_mode": cx.execute(text("SELECT @@sql_mode")).scalar(),
            "charset": cx.execute(text("SELECT @@character_set_database")).scalar(),
            "collation": cx.execute(text("SELECT @@collation_database")).scalar(),
            "zona_horaria": cx.execute(text("SELECT @@time_zone")).scalar(),
        }
        p = {"bd": bd}
        consultas = {
            "tablas": """SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH,
                                AUTO_INCREMENT, CREATE_TIME, UPDATE_TIME, TABLE_COLLATION
                         FROM information_schema.TABLES WHERE TABLE_SCHEMA = :bd ORDER BY TABLE_NAME""",
            "columnas": """SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
                                  COLUMN_KEY, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME
                           FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :bd
                           ORDER BY TABLE_NAME, ORDINAL_POSITION""",
            "llaves_foraneas": """SELECT k.TABLE_NAME, k.COLUMN_NAME, k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME,
                                         k.REFERENCED_COLUMN_NAME, r.UPDATE_RULE, r.DELETE_RULE
                                  FROM information_schema.KEY_COLUMN_USAGE k
                                  JOIN information_schema.REFERENTIAL_CONSTRAINTS r
                                    ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
                                  WHERE k.TABLE_SCHEMA = :bd AND k.REFERENCED_TABLE_NAME IS NOT NULL""",
            "indices": """SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, INDEX_TYPE
                          FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = :bd
                          ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX""",
        }
        for nombre, sql in consultas.items():
            pd.read_sql(text(sql), cx, params=p).to_csv(SALIDA / f"{nombre}.csv", index=False)

        tablas = pd.read_csv(SALIDA / "tablas.csv")
        creates, conteos = [], {}
        for t in tablas["TABLE_NAME"]:
            fila = cx.execute(text(f"SHOW CREATE TABLE `{t}`")).fetchone()
            creates.append(f"-- {t}\n{fila[1]};\n")
            n = cx.execute(text(f"SELECT COUNT(*) FROM `{t}`")).scalar()
            conteos[t] = int(n)
            df = pd.read_sql(text(f"SELECT * FROM `{t}` LIMIT {MAX_FILAS}"), cx)
            for col in df.columns:
                if es_pii(col, t):
                    df[col] = df[col].map(enmascarar)
                elif df[col].dtype == object and df[col].astype(str).str.lstrip().str[:1].isin(["{", "["]).any():
                    df[col] = df[col].map(enmascarar_json)
            with gzip.open(SALIDA / "datos" / f"{t}.csv.gz", "wt", encoding="utf-8", newline="") as f:
                df.to_csv(f, index=False)
            print(f"  {t:35s} {n:>8} filas")
        (SALIDA / "create_tables.sql").write_text("\n".join(creates), encoding="utf-8")
        servidor["filas_por_tabla"] = conteos
        (SALIDA / "servidor.json").write_text(json.dumps(servidor, indent=2, ensure_ascii=False, default=str),
                                              encoding="utf-8")
    print(f"\nExportación lista en: {SALIDA}")


if __name__ == "__main__":
    main()
