from flask import Blueprint, jsonify
from app.models.customer import Customer
from app.models.interacciones_cliente import InteraccionesCliente
from app.models.metricas_historicas import MetricasHistoricas
from app.services.ia_service import assign_segments_to_customers
from app.services.ia_service import prepare_churn_data
import joblib
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
 

# Crear un blueprint para cada predicción
predictions_bp = Blueprint('predictions', __name__)

# Prediccion de abandono para todos los clientes (CHURN)
@predictions_bp.route('/predict-churn', methods=['GET'])
@jwt_required()
def predict_churn_all():
    """
    Predice churn para todos los clientes y guarda la probabilidad en la base de datos.
    """
    try:
        print("Iniciando la actualización de Churn para todos los clientes...")
        # Obtener datos de clientes, interacciones y métricas
        clientes = Customer.query.all()
        interacciones = InteraccionesCliente.query.all()
        metricas = MetricasHistoricas.query.all()
        
        # Preparar datos para el modelo
        data = prepare_churn_data(clientes, interacciones, metricas)

        if data.empty:
            return jsonify({"message": "No hay clientes para procesar."}), 200
            # Cargar el modelo entrenado
            modelo = joblib.load("app/ia/churn_model/churn_model.pkl")
            # Predecir probabilidades de churn
            data["churn_probabilidad"] = modelo.predict_proba(data.drop(columns=["id"]))[:, 1]
        
            # Actualizar la probabilidad de churn en la tabla Clientes
            for _, row in data.iterrows():
                cliente = Customer.query.get(row["id"])
                if cliente:
                    cliente.probabilidad_churn = row["churn_probabilidad"]
                    db.session.add(cliente)  # Marcar el cliente para actualización
            db.session.commit()  # Confirmar los cambios en la base de datos
            
            return  jsonify({"mensage": " Actualización de Churn completada."}), 200
    except FileNotFoundError:
        return jsonify({"error": "Modelo de churn no encontrado en el servidor."}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al predecir churn: {str(e)}"}), 500


# Tendencias globales de probabilidad de churn
# Obtener promedio global de probabilidad de churn
# Tendencias globales de probabilidad de churn para el usuario autenticado (solo clientes con churn > 0.50)
@predictions_bp.route('/global/churn_avg', methods=['GET'])
@jwt_required()
def get_global_churn_avg():
    try:
        user_id = get_jwt_identity()  # Obtener el usuario autenticado

        # Obtener los clientes del usuario autenticado
        clientes_usuario = db.session.query(Customer.id).join(
            InteraccionesCliente, InteraccionesCliente.cliente_id == Customer.id
        ).filter(InteraccionesCliente.usuario_id == user_id).subquery()

        # Calcular la probabilidad de churn solo para clientes con churn > 0.50
        total_churn, total_clientes = db.session.query(
            db.func.sum(Customer.probabilidad_churn),
            db.func.count(Customer.id)
        ).filter(Customer.id.in_(clientes_usuario), Customer.probabilidad_churn > 0.50).one()

        # Manejar el caso donde no hay clientes con churn > 0.50
        if total_clientes is None or total_clientes == 0:
            return jsonify({"Probabilidad de Abandono General (<0.50)": "Sin riesgo"}), 200

        # Calcular el promedio y redondear a 2 decimales
        promedio_churn = round(total_churn / total_clientes, 2)

        return jsonify({"Probabilidad de Abandono General (>0.50)": promedio_churn}), 200
    except Exception as e:
        return jsonify({"error":str(e)}), 500


# Predecir Abandono para 1 cliente (Se utiliza al momento de crear una nueva compra)
def predict_churn_for_customer(customer_id):
    """
    Predice churn para un solo cliente y retorna su probabilidad.
    """

    # Obtener cliente específico
    cliente = Customer.query.get(customer_id)
    if not cliente:
        return None

    # Obtener datos de interacciones y métricas para ese cliente
    interacciones = InteraccionesCliente.query.filter_by(cliente_id=customer_id).all()
    metricas = MetricasHistoricas.query.filter_by(cliente_id=customer_id).all()

    # Preparar datos
    data = prepare_churn_data([cliente], interacciones, metricas)
    if data.empty:
        return None
    # Cargar modelo entrenado
    modelo = joblib.load("app/ia/churn_model/churn_model.pkl")

    # Predecir probabilidad de churn
    return modelo.predict_proba(data.drop(columns=["id"]))[:, 1][0]




# Asignar Segmento (Clusters)
@predictions_bp.route('/segment-clients', methods=['POST'])
@jwt_required()
def segment_clients():
    """
    Ejecuta la segmentación de clientes usando K-means.
    """
    try:
        succes, msg = assign_segments_to_customers()
        if not succes:
            return jsonify({"error": msg}), 500
        return jsonify({"message": "Segmentación completada exitosamente."}), 200
    except ValueError as ve:
        return jsonify({"error": f"Error de validación: {str(ve)}"}), 400
    except FileNotFoundError:
        return jsonify({"error": "Modelo de segmentación no encontrado."}), 500
    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


