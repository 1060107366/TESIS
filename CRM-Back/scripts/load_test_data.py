"""Carga de datos de prueba: 50 clientes por usuario."""
import random
from app import create_app
from app import db
from app.models.customer import Customer
from app.models.interacciones_cliente import InteraccionesCliente

app = create_app()
with app.app_context():
    from sqlalchemy import text
    users = db.session.execute(text("SELECT id FROM usuario")).fetchall()
    print("Usuarios encontrados:", len(users))

    total = 0
    for (user_id,) in users:
        for i in range(50):
            cliente = Customer(
                usuario_id=user_id,
                nombre=f"Cliente Test {user_id}_{i}",
                email=f"test{user_id}_{i}@example.com",
                telefono=f"300{user_id}{i:04d}"[:10],
                total_compras=0,
                valor_medio_orden=0.0,
                frecuencia_compra=0.0,
                valor_cliente=0.0,
                fecha_creacion=db.func.now(),
                fecha_actualizacion=db.func.now(),
            )
            db.session.add(cliente)
            db.session.flush()  # get id

            # registrar propiedad base
            interaccion = InteraccionesCliente(
                cliente_id=cliente.id,
                usuario_id=user_id,
                tipo_interaccion_id=3,
                data_interaccion={"cambios": {}},
            )
            db.session.add(interaccion)
            total += 1

    db.session.commit()
    print(f"Clientes creados: {total}")