from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
import joblib

from app import db
from app.models.customer import Customer
from app.models.interacciones_cliente import InteraccionesCliente
from app.models.metricas_historicas import MetricasHistoricas
from app.services.ia_service import assign_segments_to_customers, prepare_churn_data

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/predict-churn', methods=['GET'])
@jwt_required()
def predict_churn_all():
    try:
        print("Iniciando la actualización de Churn para todos los clientes...")
        clientes = Customer.query.all()
        interacciones = InteraccionesCliente.query.all()
        metricas = MetricasHistoricas.query.all()

        data = prepare_churn_data(clientes, interacciones, metricas)
        if data.empty:
            return jsonify({"message": "No hay clientes para procesar."}), 200

        modelo = joblib.load("app/ia/churn_model/churn_model.pkl")
        data["churn_probabilidad"] = modelo.predict_proba(data.drop(columns=["id"]))[:, 1]

        for _, row in data.iterrows():
            cliente = Customer.query.get(int(row["id"]))
            if cliente:
                cliente.probabilidad_churn = float(row["churn_probabilidad"])

        db.session.commit()
        return jsonify({"message": "Actualización de Churn completada."}), 200

    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al predecir churn: {str(e)}"}), 500


@predictions_bp.route('/global/churn_avg', methods=['GET'])
@jwt_required()
def get_global_churn_avg():
    try:
        user_id = get_jwt_identity()

        clientes_usuario = db.session.query(Customer.id).join(
            InteraccionesCliente, InteraccionesCliente.cliente_id == Customer.id
        ).filter(InteraccionesCliente.usuario_id == user_id).subquery()

        total_churn, total_clientes = db.session.query(
            func.sum(Customer.probabilidad_churn),
            func.count(Customer.id)
        ).filter(Customer.id.in_(clientes_usuario), Customer.probabilidad_churn > 0.50).one()

        if total_clientes is None or total_clientes == 0:
            return jsonify({"Probabilidad de Abandono General (<0.50)": "Sin riesgo"}), 200

        promedio_churn = round(total_churn / total_clientes, 2)
        return jsonify({"Probabilidad de Abandono General (>0.50)": promedio_churn}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def predict_churn_for_customer(customer_id):
    """Predice churn para un solo cliente (se usa al registrar una compra)."""
    cliente = Customer.query.get(customer_id)
    if not cliente:
        return None

    interacciones = InteraccionesCliente.query.filter_by(cliente_id=customer_id).all()
    metricas = MetricasHistoricas.query.filter_by(cliente_id=customer_id).all()

    data = prepare_churn_data([cliente], interacciones, metricas)
    if data.empty:
        return None

    modelo = joblib.load("app/ia/churn_model/churn_model.pkl")
    return modelo.predict_proba(data.drop(columns=["id"]))[:, 1][0]


@predictions_bp.route('/segment-clients', methods=['POST'])
@jwt_required()
def segment_clients():
    try:
        success, msg = assign_segments_to_customers()
        if not success:
            return jsonify({"error": msg}), 500
        return jsonify({"message": "Segmentación completada exitosamente."}), 200
    except ValueError as ve:
        return jsonify({"error": f"Error de validación: {str(ve)}"}), 400
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500