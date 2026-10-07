from app.models.recomendaciones import Recomendaciones
from app.models.catalogo_recomendaciones import CatalogoRecomendaciones
from app.models.customer import Customer
from app import db
from datetime import datetime

def generate_recommendations(customer_id):
    """
    Genera recomendaciones para un cliente específico basado en su segmento y métricas.
    """
    # Obtener el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return {"error": "Cliente no encontrado"}

    # Obtener el catálogo de recomendaciones para el segmento del cliente
    catalogos = CatalogoRecomendaciones.query.filter_by(segmento_id=customer.segmento_id).all()

    for catalogo in catalogos:
        reglas = catalogo.reglas

        # Verificar si el cliente cumple con las reglas
        cumple_criterios = (
            customer.frecuencia_compra >= reglas.get("min_frecuencia_compra", 0) and
            customer.probabilidad_churn <= reglas.get("max_probabilidad_churn", 1)
        )

        if cumple_criterios:
            # Crear una nueva recomendación
            nueva_recomendacion = Recomendaciones(
                cliente_id=customer_id,
                catalogo_recomendacion_id=catalogo.id,
                data_recomendacion={
                    "tipo_recomendacion": catalogo.tipo_recomendacion,
                    "descuento": reglas.get("descuento", 0),
                },
                aplicada=False,  # Por defecto, la recomendación no está aplicada
                fecha_creacion=datetime.utcnow(),
                fecha_actualizacion=datetime.utcnow()
            )
            db.session.add(nueva_recomendacion)
    
    db.session.commit()
    return {"message": "Recomendaciones generadas exitosamente"}
