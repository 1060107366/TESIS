"""
Puente entre las rutas de la API y los modelos de IA.

- Abandono (churn):       app/ia/churn_v2/       (notebooks DataPrepare / TrainModel)
- Segmentación (K-means): app/ia/segmentacion/   (notebooks DataPrepare / TrainModel)
"""
from app.models.customer import Customer
from app import db


def assign_segments_to_customers(customer_id=None, usuario_id=None):
    """Asigna segmentos con el modelo K-means RFM v2.

    - Con `customer_id`: actualiza ese cliente (las variables se calculan con toda su
      tienda, porque el gasto se compara con el cliente típico de la tienda).
    - Con `usuario_id`: actualiza todos los clientes de ese usuario.
    - Sin argumentos: todos los clientes.
    Devuelve (éxito, mensaje), como la versión anterior.
    """
    from app.ia.segmentacion import servicio as segmentacion
    try:
        if customer_id is not None:
            cliente = db.session.get(Customer, customer_id)
            if cliente is None:
                return False, "Cliente no encontrado"
            resumen = segmentacion.actualizar_segmentos(usuario_id=cliente.usuario_id, cliente_ids=[customer_id])
        else:
            resumen = segmentacion.actualizar_segmentos(usuario_id=usuario_id)
        if resumen["clientes"] == 0:
            return True, "Sin clientes para segmentar"
        return True, f"Segmentos actualizados correctamente: {resumen['por_segmento']}"
    except Exception as e:
        db.session.rollback()
        return False, f"Error en el proceso de segmentación: {str(e)}"
