from sqlalchemy import func
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.predicciones import Prediccion
from app.models.metricas_historicas import MetricasHistoricas
from app.models.customer import Customer
from app.models.segmento import Segmento
from app.models.interacciones_cliente import InteraccionesCliente
from decimal import Decimal
from sqlalchemy import distinct

trends_bp = Blueprint('trends', __name__)

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

@trends_bp.route('/global/frecuencia_compra', methods=['GET'])
@jwt_required()
def get_global_frecuencia_compra():
    try:
        current_user_id = get_jwt_identity()

        metricas = db.session.query(
            MetricasHistoricas.cliente_id,
            MetricasHistoricas.valor,
            MetricasHistoricas.fecha_registro
        ).join(
            InteraccionesCliente,
            MetricasHistoricas.cliente_id == InteraccionesCliente.cliente_id
        ).filter(
            MetricasHistoricas.tipo_metrica == 'frecuencia_compra',
            InteraccionesCliente.usuario_id == current_user_id
        ).distinct().all()

        data = [
            {
                "cliente_id": m.cliente_id,
                "valor": decimal_to_float(m.valor),
                "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None
            }
            for m in metricas
        ]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trends_bp.route('/global/valor_medio_orden', methods=['GET'])
@jwt_required()
def get_global_valor_medio_orden():
    try:
        current_user_id = get_jwt_identity()

        metricas = db.session.query(
            MetricasHistoricas.cliente_id,
            MetricasHistoricas.valor,
            MetricasHistoricas.fecha_registro
        ).join(
            InteraccionesCliente,
            MetricasHistoricas.cliente_id == InteraccionesCliente.cliente_id
        ).filter(
            MetricasHistoricas.tipo_metrica == 'valor_medio_orden',
            InteraccionesCliente.usuario_id == current_user_id
        ).distinct().all()

        data = [
            {
                "cliente_id": m.cliente_id,
                "valor": decimal_to_float(m.valor),
                "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None
            }
            for m in metricas
        ]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trends_bp.route('/global/actividad_mensual', methods=['GET'])
@jwt_required()
def get_global_actividad_mensual():
    try:
        user_id = get_jwt_identity()
        from datetime import datetime, timedelta
        from sqlalchemy import func, extract

        # últimos 6 meses
        six_months_ago = datetime.utcnow().replace(day=1) - timedelta(days=30*5)

        results = db.session.query(
            extract('year', InteraccionesCliente.fecha_creacion).label('anio'),
            extract('month', InteraccionesCliente.fecha_creacion).label('mes'),
            func.count(InteraccionesCliente.id).label('cantidad')
        ).filter(
            InteraccionesCliente.usuario_id == user_id,
            InteraccionesCliente.fecha_creacion >= six_months_ago
        ).group_by(
            extract('year', InteraccionesCliente.fecha_creacion),
            extract('month', InteraccionesCliente.fecha_creacion)
        ).order_by(
            extract('year', InteraccionesCliente.fecha_creacion),
            extract('month', InteraccionesCliente.fecha_creacion)
        ).all()

        meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        data = [{"month": f"{meses[int(r.mes)-1]} {int(r.anio)}", "value": int(r.cantidad)} for r in results]
        if not data:
            # fallback para que el gráfico no quede vacío
            data = [{"month": datetime.utcnow().strftime('%b'), "value": 0}]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@trends_bp.route('/global/clientes_por_segmento', methods=['GET'])
@jwt_required()
def get_clientes_por_segmento():
    try:
        current_user_id = get_jwt_identity()

        segmentos = db.session.query(
            Segmento.nombre,
            func.count(distinct(Customer.id)).label('cantidad')
        ).join(
            Customer,
            Customer.segmento_id == Segmento.id
        ).join(
            InteraccionesCliente,
            Customer.id == InteraccionesCliente.cliente_id
        ).filter(
            InteraccionesCliente.usuario_id == current_user_id
        ).group_by(
            Segmento.nombre
        ).all()

        data = [
            {
                "name": segmento.nombre,
                "value": int(segmento.cantidad)
            }
            for segmento in segmentos
        ]

        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trends_bp.route('/customer/<int:cliente_id>/frecuencia_compra', methods=['GET'])
@jwt_required()
def get_customer_frecuencia_compra(cliente_id):
    try:
        current_user_id = get_jwt_identity()

        # Verificar que el cliente pertenezca al usuario actual
        interaccion = InteraccionesCliente.query.filter_by(
            cliente_id=cliente_id,
            usuario_id=current_user_id
        ).first()

        if not interaccion:
            return jsonify({"error": "Cliente no encontrado"}), 404

        metricas = db.session.query(
            MetricasHistoricas.valor,
            MetricasHistoricas.fecha_registro
        ).filter(
            MetricasHistoricas.cliente_id == cliente_id,
            MetricasHistoricas.tipo_metrica == 'frecuencia_compra'
        ).all()

        data = [
            {
                "valor": decimal_to_float(m.valor),
                "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None
            }
            for m in metricas
        ]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trends_bp.route('/customer/<int:cliente_id>/valor_medio_orden', methods=['GET'])
@jwt_required()
def get_customer_valor_medio_orden(cliente_id):
    try:
        current_user_id = get_jwt_identity()

        # Verificar que el cliente pertenezca al usuario actual
        interaccion = InteraccionesCliente.query.filter_by(
            cliente_id=cliente_id,
            usuario_id=current_user_id
        ).first()

        if not interaccion:
            return jsonify({"error": "Cliente no encontrado"}), 404

        metricas = db.session.query(
            MetricasHistoricas.valor,
            MetricasHistoricas.fecha_registro
        ).filter(
            MetricasHistoricas.cliente_id == cliente_id,
            MetricasHistoricas.tipo_metrica == 'valor_medio_orden'
        ).all()

        data = [
            {
                "valor": decimal_to_float(m.valor),
                "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None
            }
            for m in metricas
        ]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500