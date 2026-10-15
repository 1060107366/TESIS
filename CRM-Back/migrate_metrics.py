from sqlalchemy import create_engine, text

url = "mysql+pymysql://root:SQL2026!@localhost:3306/crm_db"
eng = create_engine(url)
with eng.begin() as conn:
    conn.execute(text("CREATE TABLE IF NOT EXISTS backup_metricas_historicas_20261014 AS SELECT * FROM metricas_historicas"))
    conn.execute(text("ALTER TABLE metricas_historicas MODIFY valor DECIMAL(10,2) NOT NULL"))
print("OK")