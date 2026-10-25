from app.models.recomendaciones import Recomendaciones
from app.models.catalogo_recomendaciones import CatalogoRecomendaciones
from app.models.customer import Customer
from app import db
from datetime import datetime


def generate_recommendations(customer_id):
    """
    Genera (o actualiza) las recomendaciones de un cliente según su segmento y métricas.

    Cada combinación cliente + recomendación del catálogo existe una sola vez
    (restricción única uq_recomendaciones_cliente_catalogo): si ya existe se actualiza,
    y si el cliente dejó de cumplir las reglas y no estaba aplicada, se elimina.
    """
    customer = db.session.get(Customer, customer_id)
    if not customer:
        return {"error": "Cliente no encontrado"}

    frecuencia = customer.frecuencia_compra or 0
    riesgo = customer.probabilidad_churn if customer.probabilidad_churn is not None else 0.0
    ahora = datetime.utcnow()

    existentes = {r.catalogo_recomendacion_id: r
                  for r in Recomendaciones.query.filter_by(cliente_id=customer_id).all()}
    vigentes = set()

    for catalogo in CatalogoRecomendaciones.query.filter_by(segmento_id=customer.segmento_id).all():
        reglas = catalogo.reglas or {}
        if not (frecuencia >= reglas.get("min_frecuencia_compra", 0)
                and riesgo <= reglas.get("max_probabilidad_churn", 1)):
            continue
        vigentes.add(catalogo.id)
        datos = {"tipo_recomendacion": catalogo.tipo_recomendacion, "descuento": reglas.get("descuento", 0)}
        if catalogo.id in existentes:
            existentes[catalogo.id].data_recomendacion = datos
            existentes[catalogo.id].fecha_actualizacion = ahora
        else:
            db.session.add(Recomendaciones(
                cliente_id=customer_id, catalogo_recomendacion_id=catalogo.id, data_recomendacion=datos,
                aplicada=False, fecha_creacion=ahora, fecha_actualizacion=ahora))

    # Recomendaciones que ya no aplican (p. ej. el cliente cambió de segmento) y no se usaron
    for cat_id, rec in existentes.items():
        if cat_id not in vigentes and not rec.aplicada:
            db.session.delete(rec)

    db.session.commit()
    return {"message": "Recomendaciones generadas exitosamente", "vigentes": len(vigentes)}
