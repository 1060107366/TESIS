from datetime import datetime, timezone
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
    CLV histórico normalizado: valor promedio generado por el cliente por mes de vida.
    Evita división por cero para clientes creados el mismo día.
    """
    dias_vida = (datetime.now(timezone.utc) - fecha_creacion).days
    meses_vida = max(dias_vida, 1) / 30  # mínimo 1 "mes" para clientes nuevos

    total_historico = valor_medio_orden * total_compras
    clv_mensual = total_historico / meses_vida
    return round(clv_mensual, 2)


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
        cliente.ultima_compra if cliente.ultima_compra else datetime.now(timezone.utc),
        cliente.total_compras
    )
    # Calcular CLV (Customer Lifetime Value)
    cliente.valor_cliente = calculate_clv(
        cliente.valor_medio_orden,
        cliente.total_compras,
        cliente.fecha_creacion
    )

    periodo = datetime.now(timezone.utc).strftime("%B %Y")
    metricas = [
        ("frecuencia_compra", cliente.frecuencia_compra),
        ("valor_medio_orden", cliente.valor_medio_orden),
        ("valor_cliente", cliente.valor_cliente),
    ]
    for tipo, valor in metricas:
        existente = MetricasHistoricas.query.filter_by(
            cliente_id=cliente.id, tipo_metrica=tipo, periodo=periodo
        ).first()
        if existente:
            existente.valor = valor
            existente.fecha_registro = datetime.now(timezone.utc)
        else:
            save_metrics(cliente.id, tipo, valor)
            
    # Guardar cambios en la base de datos
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

