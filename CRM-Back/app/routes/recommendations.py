from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.recomendaciones import Recomendaciones
from app.models.catalogo_recomendaciones import CatalogoRecomendaciones
from app.models.interacciones_cliente import InteraccionesCliente
from app.models.customer import Customer
from app.services.recommendation_service import generate_recommendations
from app import db

recommendations_bp = Blueprint('recomendaciones', __name__)


@recommendations_bp.route('/catalogo', methods=['GET'])
@jwt_required()
def get_catalogo():
    """Obtiene el catálogo de recomendaciones por segmento"""
    catalogos = CatalogoRecomendaciones.query.all()
    return jsonify([{
        "id": cat.id,
        "segmento_id": cat.segmento_id,
        "tipo_recomendacion": cat.tipo_recomendacion,
        "reglas": cat.reglas,
        "fecha_creacion": cat.fecha_creacion
    } for cat in catalogos]), 200


@recommendations_bp.route('/generar-todos', methods=['POST'])
@jwt_required()
def generate_all_recommendations():
    """Genera recomendaciones para todos los clientes del usuario"""
    user_id = get_jwt_identity()

    # Clientes del usuario
    customer_ids = [c.id for c in Customer.query.with_entities(Customer.id).filter_by(usuario_id=int(user_id)).all()]

    results = {"exitosos": 0, "errores": 0, "detalles": []}
    for cid in customer_ids:
        try:
            result = generate_recommendations(cid)
            if "error" not in result:
                results["exitosos"] += 1
            else:
                results["errores"] += 1
            results["detalles"].append({"cliente_id": cid, "resultado": result})
        except Exception as e:
            results["errores"] += 1
            results["detalles"].append({"cliente_id": cid, "resultado": {"error": str(e)}})

    return jsonify(results), 200


@recommendations_bp.route('/generar/<int:customer_id>', methods=['POST'])
@jwt_required()
def generate_customer_recommendations(customer_id):
    """Genera recomendaciones para un cliente específico"""
    user_id = get_jwt_identity()

    # Verificar propiedad
    if not Customer.query.filter_by(id=customer_id, usuario_id=int(user_id)).first():
        return jsonify({"error": "Cliente no encontrado"}), 404

    result = generate_recommendations(customer_id)
    return jsonify(result), 200


@recommendations_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_recommendations(customer_id):
    user_id = get_jwt_identity()

    # Verificación de propiedad
    if not Customer.query.filter_by(id=customer_id, usuario_id=int(user_id)).first():
        return jsonify({"error": "Cliente no encontrado"}), 404

    recommendations = Recomendaciones.query.filter_by(
        cliente_id=customer_id, aplicada=False
    ).all()

    return jsonify([{
        "id": rec.id,
        "cliente_id": rec.cliente_id,
        "tipo_recomendacion": rec.data_recomendacion.get("tipo_recomendacion"),
        "descuento": rec.data_recomendacion.get("descuento"),
        "fecha_creacion": rec.fecha_creacion.isoformat() if rec.fecha_creacion else None,
        "aplicada": rec.aplicada
    } for rec in recommendations]), 200