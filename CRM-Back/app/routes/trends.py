from datetime import datetime
from decimal import Decimal

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, extract, distinct

from app import db
from app.models.customer import Customer
from app.models.interacciones_cliente import InteraccionesCliente
from app.models.metricas_historicas import MetricasHistoricas
from app.models.segmento import Segmento

trends_bp = Blueprint('trends', __name__)

TIPO_COMPRA = 2
MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre",
                "Octubre", "Noviembre", "Diciembre"]


def decimal_to_float(obj):
    return float(obj) if isinstance(obj, Decimal) else obj


def _usuario_actual() -> int:
    return int(get_jwt_identity())


def _inicio_mes(meses_atras: int) -> datetime:
    """Primer día del mes, `meses_atras` meses antes del mes actual (0 = mes actual)."""
    hoy = datetime.utcnow()
    total = hoy.year * 12 + (hoy.month - 1) - meses_atras
    return datetime(total // 12, total % 12 + 1, 1)


def _ultimos_meses(n: int):
    """Lista [(año, mes)] de los últimos n meses, del más antiguo al actual."""
    return [(d.year, d.month) for d in (_inicio_mes(k) for k in range(n - 1, -1, -1))]


def _monto_compra():
    return func.json_unquote(func.json_extract(InteraccionesCliente.data_interaccion, '$.monto')).cast(db.Numeric(14, 2))


def _por_mes(valor, meses: int, solo_compras: bool):
    """Agrega `valor` por mes para las interacciones de los clientes del usuario (meses sin datos = 0)."""
    q = (db.session.query(extract('year', InteraccionesCliente.fecha_creacion).label('anio'),
                          extract('month', InteraccionesCliente.fecha_creacion).label('mes'),
                          valor.label('valor'))
         .join(Customer, Customer.id == InteraccionesCliente.cliente_id)
         .filter(Customer.usuario_id == _usuario_actual(),
                 InteraccionesCliente.fecha_creacion >= _inicio_mes(meses - 1)))
    if solo_compras:
        q = q.filter(InteraccionesCliente.tipo_interaccion_id == TIPO_COMPRA)
    q = q.group_by('anio', 'mes')
    datos = {(int(r.anio), int(r.mes)): float(r.valor or 0) for r in q.all()}
    return [{"month": f"{MESES[m - 1]} {a}", "value": datos.get((a, m), 0)} for a, m in _ultimos_meses(meses)]


@trends_bp.route('/global/ingresos_mensuales', methods=['GET'])
@jwt_required()
def get_global_ingresos_mensuales():
    """Suma de las compras por mes, últimos 12 meses (incluye el actual)."""
    return jsonify(_por_mes(func.sum(_monto_compra()), 12, solo_compras=True)), 200


@trends_bp.route('/global/ingresos_ultimo_mes', methods=['GET'])
@jwt_required()
def get_ingresos_ultimo_mes():
    """Total de compras del mes anterior completo."""
    inicio, fin = _inicio_mes(1), _inicio_mes(0)
    total = (db.session.query(func.sum(_monto_compra()))
             .join(Customer, Customer.id == InteraccionesCliente.cliente_id)
             .filter(Customer.usuario_id == _usuario_actual(),
                     InteraccionesCliente.tipo_interaccion_id == TIPO_COMPRA,
                     InteraccionesCliente.fecha_creacion >= inicio,
                     InteraccionesCliente.fecha_creacion < fin)
             .scalar())
    return jsonify({
        "total_ingresos": float(total or 0),
        "mes": f"{MESES_LARGOS[inicio.month - 1]} {inicio.year}",
        "mes_corto": f"{MESES[inicio.month - 1]} {inicio.year}",
    }), 200


@trends_bp.route('/global/actividad_mensual', methods=['GET'])
@jwt_required()
def get_global_actividad_mensual():
    """Número de interacciones por mes, últimos 6 meses."""
    return jsonify(_por_mes(func.count(InteraccionesCliente.id), 6, solo_compras=False)), 200


def _metricas_globales(tipo):
    filas = (db.session.query(MetricasHistoricas.cliente_id, MetricasHistoricas.valor, MetricasHistoricas.fecha_registro)
             .join(Customer, Customer.id == MetricasHistoricas.cliente_id)
             .filter(Customer.usuario_id == _usuario_actual(), MetricasHistoricas.tipo_metrica == tipo)
             .order_by(MetricasHistoricas.fecha_registro).all())
    return [{"cliente_id": m.cliente_id, "valor": decimal_to_float(m.valor),
             "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None} for m in filas]


@trends_bp.route('/global/frecuencia_compra', methods=['GET'])
@jwt_required()
def get_global_frecuencia_compra():
    return jsonify(_metricas_globales('frecuencia_compra')), 200


@trends_bp.route('/global/valor_medio_orden', methods=['GET'])
@jwt_required()
def get_global_valor_medio_orden():
    return jsonify(_metricas_globales('valor_medio_orden')), 200


@trends_bp.route('/global/clientes_por_segmento', methods=['GET'])
@jwt_required()
def get_clientes_por_segmento():
    """Clientes del usuario por segmento (nombres de la tabla `segmentos`)."""
    filas = (db.session.query(Segmento.id, Segmento.nombre, func.count(distinct(Customer.id)).label('cantidad'))
             .join(Customer, Customer.segmento_id == Segmento.id)
             .filter(Customer.usuario_id == _usuario_actual())
             .group_by(Segmento.id, Segmento.nombre)
             .order_by(Segmento.id).all())
    return jsonify([{"segmento_id": s.id, "name": s.nombre, "value": int(s.cantidad)} for s in filas]), 200


def _metricas_cliente(cliente_id, tipo):
    if not Customer.query.filter_by(id=cliente_id, usuario_id=_usuario_actual()).first():
        return jsonify({"error": "Cliente no encontrado"}), 404
    filas = (MetricasHistoricas.query.filter_by(cliente_id=cliente_id, tipo_metrica=tipo)
             .order_by(MetricasHistoricas.fecha_registro).all())
    return jsonify([{"valor": decimal_to_float(m.valor),
                     "fecha": m.fecha_registro.isoformat() if m.fecha_registro else None} for m in filas]), 200


@trends_bp.route('/customer/<int:cliente_id>/frecuencia_compra', methods=['GET'])
@jwt_required()
def get_customer_frecuencia_compra(cliente_id):
    return _metricas_cliente(cliente_id, 'frecuencia_compra')


@trends_bp.route('/customer/<int:cliente_id>/valor_medio_orden', methods=['GET'])
@jwt_required()
def get_customer_valor_medio_orden(cliente_id):
    return _metricas_cliente(cliente_id, 'valor_medio_orden')
