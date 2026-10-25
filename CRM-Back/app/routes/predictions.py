from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from app import db
from app.models.customer import Customer
from app.services.ia_service import assign_segments_to_customers
from app.ia.churn_v2 import servicio as churn
from app.ia.segmentacion import servicio as segmentacion

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/predict-churn', methods=['GET', 'POST'])
@jwt_required()
def predict_churn_all():
    """Recalcula la probabilidad de abandono (modelo v2) de los clientes del usuario autenticado.

    Se mantiene GET por compatibilidad con el frontend actual; POST es el método recomendado.
    """
    try:
        user_id = get_jwt_identity()
        resumen = churn.actualizar_probabilidades(usuario_id=user_id)
        if resumen["clientes"] == 0:
            return jsonify({"message": "No hay clientes para procesar."}), 200
        return jsonify({"message": "Actualización de Churn completada.", **resumen}), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al predecir churn: {str(e)}"}), 500


@predictions_bp.route('/churn/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_churn_detail(customer_id):
    """Probabilidad, nivel de riesgo y razones legibles para un cliente."""
    user_id = get_jwt_identity()
    cliente = Customer.query.filter_by(id=customer_id, usuario_id=int(user_id)).first()
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404
    try:
        res = churn.predecir(usuario_id=user_id, cliente_ids=[customer_id]).get(customer_id)
        return jsonify(res or {"estado": "sin_historial"}), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500


@predictions_bp.route('/churn/modelo', methods=['GET'])
@jwt_required()
def get_churn_model_info():
    """Versión, algoritmo y métricas de test del modelo activo (para la vista de Análisis)."""
    try:
        return jsonify(churn.info_modelo()), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500


@predictions_bp.route('/churn/monitoreo', methods=['GET'])
@jwt_required()
def get_churn_monitoring():
    """Deriva de datos (PSI) de los clientes del usuario frente a los datos de entrenamiento."""
    try:
        return jsonify(churn.monitorear(usuario_id=get_jwt_identity())), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500


@predictions_bp.route('/global/churn_avg', methods=['GET'])
@jwt_required()
def get_global_churn_avg():
    try:
        user_id = int(get_jwt_identity())

        total_churn, total_clientes = db.session.query(
            func.sum(Customer.probabilidad_churn),
            func.count(Customer.id)
        ).filter(Customer.usuario_id == user_id, Customer.probabilidad_churn > 0.50).one()

        if total_clientes is None or total_clientes == 0:
            return jsonify({"Probabilidad de Abandono General (<0.50)": "Sin riesgo"}), 200

        promedio_churn = round(total_churn / total_clientes, 2)
        return jsonify({"Probabilidad de Abandono General (>0.50)": promedio_churn}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def predict_churn_for_customer(customer_id):
    """Predice churn para un solo cliente (se usa al registrar una compra).

    Devuelve la probabilidad (float) o None si el cliente no tiene historial de compras.
    Las features se calculan sobre toda la tienda del cliente, para normalizar los montos.
    """
    cliente = db.session.get(Customer, customer_id)
    if not cliente:
        return None
    res = churn.predecir(usuario_id=cliente.usuario_id, cliente_ids=[customer_id]).get(customer_id)
    return None if res is None else res["probabilidad"]


@predictions_bp.route('/segment-clients', methods=['POST'])
@jwt_required()
def segment_clients():
    """Segmenta (K-means RFM v2) los clientes del usuario autenticado."""
    try:
        success, msg = assign_segments_to_customers(usuario_id=get_jwt_identity())
        if not success:
            return jsonify({"error": msg}), 500
        return jsonify({"message": "Segmentación completada exitosamente.", "detalle": msg}), 200
    except ValueError as ve:
        return jsonify({"error": f"Error de validación: {str(ve)}"}), 400
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


@predictions_bp.route('/segmentos/cliente/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_segment_detail(customer_id):
    """Segmento, perfil y valores RFM de un cliente."""
    user_id = get_jwt_identity()
    if not Customer.query.filter_by(id=customer_id, usuario_id=int(user_id)).first():
        return jsonify({"error": "Cliente no encontrado"}), 404
    try:
        res = segmentacion.segmentar(usuario_id=user_id, cliente_ids=[customer_id]).get(customer_id)
        return jsonify(res or {}), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500


@predictions_bp.route('/segmentos/resumen', methods=['GET'])
@jwt_required()
def get_segment_summary():
    """Clientes y perfil promedio (recencia, compras, gasto relativo) por segmento."""
    try:
        return jsonify(segmentacion.resumen_segmentos(get_jwt_identity())), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500


@predictions_bp.route('/segmentos/modelo', methods=['GET'])
@jwt_required()
def get_segment_model_info():
    """Versión, k y perfiles (centroides) del modelo de segmentación activo."""
    try:
        return jsonify(segmentacion.info_modelo()), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500
