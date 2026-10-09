from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    db.session.execute(text("""
    UPDATE clientes c
    JOIN (
        SELECT cliente_id, MIN(usuario_id) AS uid
        FROM interacciones_cliente
        GROUP BY cliente_id
    ) i ON c.id = i.cliente_id
    SET c.usuario_id = i.uid
    WHERE c.usuario_id IS NULL
"""))
    db.session.commit()
    print("✅ Backfill completado.")