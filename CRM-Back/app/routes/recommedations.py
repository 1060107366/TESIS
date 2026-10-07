from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.recomendaciones import Recomendaciones

recommendations_bp = Blueprint('recomendaciones', __name__)

@recommendations_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_recommendations(customer_id):
    """
    Obtiene las recomendaciones activas de un cliente específico.
    """
    user_id = get_jwt_identity()

    # Verificar que el cliente pertenece al usuario
    recommendations = Recomendaciones.query.filter_by(cliente_id=customer_id, aplicada=False).all()

    if not recommendations:
        return jsonify({"message": "No se encontraron recomendaciones para este cliente"}), 404

    return jsonify([{
        "id": rec.id,
        "cliente_id": rec.cliente_id,
        "tipo_recomendacion": rec.data_recomendacion.get("tipo_recomendacion"),
        "descuento": rec.data_recomendacion.get("descuento"),
        "fecha_creacion": rec.fecha_creacion,
        "aplicada": rec.aplicada
    } for rec in recommendations]), 200
