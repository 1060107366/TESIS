from app.models.customer import Customer
from app import db
from datetime import datetime

def create_customer(data):
    """
    Crea un nuevo cliente y lo guarda en la base de datos.
    """
    fecha_creacion = data.get('fecha_creacion', datetime.utcnow())
    valor_total_orden = data.get('valor_total_orden', 0.0)
    total_compras = 1 if valor_total_orden else 0
    valor_medio_orden = (valor_total_orden / total_compras) if total_compras > 0 else 0.0

    new_customer = Customer(
        nombre=data['nombre'],
        email=data['email'],
        telefono=data['telefono'],
        ultima_compra=fecha_creacion if total_compras > 0 else None,
        total_compras=total_compras,
        frecuencia_compra=0.0,  # Se recalcula después
        valor_medio_orden=valor_medio_orden,
        probabilidad_churn=0.1,  # Se recalcula después
        valor_cliente=10000.0,       # Se recalcula después
        fecha_creacion=fecha_creacion,
        fecha_actualizacion=fecha_creacion
    )
    db.session.add(new_customer)
    db.session.commit()

    return new_customer
