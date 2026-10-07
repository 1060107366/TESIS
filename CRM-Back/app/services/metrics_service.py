from datetime import datetime
from app.models.customer import Customer
from app.models.metricas_historicas import MetricasHistoricas
from app import db

# Calcular la frecuencia de compra
def calculate_purchase_frequency(fecha_creacion, ultima_compra, total_compras):
    """
    Calcula la frecuencia de compra en días promedio entre las compras.
    """
    if total_compras < 1:  # Si es la primera compra o solo una compra, no hay intervalo
        return 0.0

    # Diferencia en días entre la creación del cliente y la fecha actual
    total_days = (datetime.now() - fecha_creacion).days
    if total_days <= 0:
        return 0.0

    # Frecuencia promedio (días entre compras)
    fr=total_days/total_compras
    #fr=0
    return(fr)


# Calcular el valor medio por orden
def calculate_average_order_value(total_compras, suma_total_compras):
    """
    Calcula el valor medio por orden.
    """
    if total_compras <= 0:
        return 0.0
    return suma_total_compras / total_compras


# Calcular el Customer Lifetime Value (CLV)
def calculate_clv(valor_medio_orden, total_compras, fecha_creacion):
    """
    Calcula el CLV basado en datos históricos del cliente.
    """
    # Calcular vida del cliente en años
    vida_cliente = (datetime.utcnow() - fecha_creacion).days # Diferencia en días entre la creación del cliente y la fecha actual

    # Calcular total histórico de compras
    total_historico = valor_medio_orden * total_compras

    # Calcular CLV
    clv = total_historico / vida_cliente
    return round(clv, 2)


# Guardar métricas en la tabla MetricasHistoricas
def save_metrics(cliente_id, tipo_metrica, valor):
    """
    Guarda una métrica en la tabla MetricasHistoricas.
    """
    metrica = MetricasHistoricas(
        cliente_id=cliente_id,
        tipo_metrica=tipo_metrica,
        valor=valor,
        fecha_registro=datetime.utcnow(),
        periodo=datetime.utcnow().strftime("%B %Y")
    )
    db.session.add(metrica)


# Actualizar las métricas dinámicas de un cliente
def update_metrics(cliente):
    """
    Recalcula y actualiza las métricas del cliente.
    """
    # Recalcular la frecuencia de compra
    cliente.frecuencia_compra = calculate_purchase_frequency(
        cliente.fecha_creacion,
        cliente.ultima_compra if cliente.ultima_compra else datetime.utcnow(),
        cliente.total_compras
    )
    # Calcular CLV (Customer Lifetime Value)
    cliente.valor_cliente = calculate_clv(
        cliente.valor_medio_orden,
        cliente.total_compras,
        cliente.fecha_creacion
    )
    metrics = [
        MetricasHistoricas(
            cliente_id=cliente.id,
            tipo_metrica="frecuencia_compra",
            valor=cliente.frecuencia_compra,
            fecha_registro=datetime.utcnow(),
            periodo=datetime.utcnow().strftime("%B %Y")
        ),
        MetricasHistoricas(
            cliente_id=cliente.id,
            tipo_metrica="valor_medio_orden",
            valor=cliente.valor_medio_orden,
            fecha_registro=datetime.utcnow(),
            periodo=datetime.utcnow().strftime("%B %Y")
        ),
        MetricasHistoricas(
            cliente_id=cliente.id,
            tipo_metrica="valor_cliente",
            valor=cliente.valor_cliente,
            fecha_registro=datetime.utcnow(),
            periodo=datetime.utcnow().strftime("%B %Y")
        )
    ]
    # Guardar cambios en la base de datos
    db.session.add_all(metrics)
    db.session.commit()

# Actualizar las métricas para todos los clientes (se puede programar para ejecutarse cada x tiempo)
def update_all_customer_metrics():
    """
    Recalcula y actualiza las métricas para todos los clientes.
    """
    clientes = Customer.query.all()

    for cliente in clientes:
        update_metrics(cliente)

    db.session.commit()
    return {"message": "Métricas actualizadas para todos los clientes"}

