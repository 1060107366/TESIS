from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.customer import Customer
from app.models.interacciones_cliente import InteraccionesCliente
from app.models.metricas_historicas import MetricasHistoricas
from app.models.predicciones import Prediccion
from app.models.recomendaciones import Recomendaciones
from app.models.tipo_interaccion import TiposInteraccion
from app.routes.predictions import predict_churn_for_customer
from app.services.customer_service import create_customer
from app.services.ia_service import assign_segments_to_customers
from app.services.metrics_service import calculate_purchase_frequency, update_metrics
from app.services.recommendation_service import generate_recommendations

customer_bp = Blueprint('customer', __name__)

TIPO_CREACION, TIPO_COMPRA, TIPO_ACTUALIZACION, TIPO_ELIMINACION = 1, 2, 3, 4


# ------------------------------------------------------------------ utilidades
def _usuario_actual() -> int:
    return int(get_jwt_identity())


def _cliente_del_usuario(customer_id, user_id):
    """El cliente solo es visible para su dueño (tienda)."""
    return Customer.query.filter_by(id=customer_id, usuario_id=user_id).first()


def _monto(valor):
    """Convierte el monto a número > 0; devuelve None si no es válido."""
    try:
        monto = float(valor)
    except (TypeError, ValueError):
        return None
    return monto if monto > 0 else None


def _fecha(valor):
    """Acepta 'AAAA-MM-DD HH:MM:SS', 'AAAA-MM-DDTHH:MM[:SS]' o 'AAAA-MM-DD'."""
    if not valor:
        return datetime.utcnow()
    texto = str(valor).strip().replace("T", " ")
    for formato in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(texto[:19], formato)
        except ValueError:
            continue
    return None


def _cliente_json(customer):
    return {
        "id": customer.id,
        "nombre": customer.nombre,
        "email": customer.email,
        "telefono": customer.telefono,
        "ultima_compra": customer.ultima_compra.isoformat() if customer.ultima_compra else None,
        "total_compras": float(customer.total_compras or 0),
        "frecuencia_compra": float(customer.frecuencia_compra or 0),
        "valor_medio_orden": float(customer.valor_medio_orden or 0),
        "probabilidad_churn": float(customer.probabilidad_churn) if customer.probabilidad_churn is not None else None,
        "valor_cliente": float(customer.valor_cliente or 0),
        "segmento_id": customer.segmento_id,
    }


def _recalcular_ia(customer):
    """Métricas, riesgo de abandono (v2), segmento (K-means v2) y recomendaciones."""
    update_metrics(customer)
    prob = predict_churn_for_customer(customer.id)
    customer.probabilidad_churn = prob          # None si no tiene compras
    if prob is not None:
        db.session.add(Prediccion(
            cliente_id=customer.id, tipo_prediccion="Probabilidad de Churn",
            valor_prediccion={"probabilidad_churn": prob},
            fecha_creacion=datetime.utcnow(), fecha_actualizacion=datetime.utcnow()))
    db.session.commit()
    assign_segments_to_customers(customer.id)
    generate_recommendations(customer.id)


# ------------------------------------------------------------------ crear
@customer_bp.route('/create', methods=['POST'])
@jwt_required()
def create_customer_endpoint():
    """Crea un cliente. Registra también una compra inicial si se envía `valor_orden_total`."""
    user_id = _usuario_actual()
    data = request.get_json(silent=True) or {}

    faltan = [f for f in ("nombre", "email", "telefono") if not str(data.get(f) or "").strip()]
    if faltan:
        return jsonify({"error": f"Faltan campos requeridos: {', '.join(faltan)}"}), 400
    data["email"] = data["email"].strip().lower()
    if Customer.query.filter_by(usuario_id=user_id, email=data["email"]).first():
        return jsonify({"error": "Ya tienes un cliente registrado con ese email"}), 400

    valor_inicial = None
    if data.get("valor_orden_total") not in (None, ""):
        valor_inicial = _monto(data.get("valor_orden_total"))
        if valor_inicial is None:
            return jsonify({"error": "El valor de la orden debe ser un número mayor que 0"}), 400

    try:
        cliente = create_customer(data, user_id)
        ahora = datetime.utcnow()
        db.session.add(InteraccionesCliente(
            cliente_id=cliente.id, usuario_id=user_id, tipo_interaccion_id=TIPO_CREACION,
            data_interaccion={"accion": "Creación de cliente", "estado": "completado"}, fecha_creacion=ahora))
        if valor_inicial:
            cliente.total_compras = 1
            cliente.valor_medio_orden = valor_inicial
            cliente.ultima_compra = ahora
            db.session.add(InteraccionesCliente(
                cliente_id=cliente.id, usuario_id=user_id, tipo_interaccion_id=TIPO_COMPRA,
                data_interaccion={"accion": "Compra inicial", "monto": valor_inicial,
                                  "fecha_compra": ahora.strftime("%Y-%m-%d %H:%M:%S"), "estado": "completado"},
                fecha_creacion=ahora))
        db.session.commit()

        _recalcular_ia(cliente)

        return jsonify({
            "message": "Cliente creado exitosamente",
            "cliente_id": cliente.id,
            "nombre": cliente.nombre,
            "email": cliente.email,
            "ultima_compra": cliente.ultima_compra.isoformat() if cliente.ultima_compra else None,
            **_cliente_json(cliente),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear cliente: {str(e)}"}), 500


# ------------------------------------------------------------------ listar
@customer_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    """Clientes del usuario autenticado."""
    customers = Customer.query.filter_by(usuario_id=_usuario_actual()).order_by(Customer.id).all()
    return jsonify({"total_clientes": len(customers), "clientes": [_cliente_json(c) for c in customers]}), 200


# ------------------------------------------------------------------ actualizar / registrar compra
@customer_bp.route('/update/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    """`action=update_basic` (nombre, email, teléfono) o `action=new_interaction` (registrar compra)."""
    user_id = _usuario_actual()
    data = request.get_json(silent=True) or {}
    customer = _cliente_del_usuario(customer_id, user_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404

    action = data.get('action', 'update_basic')

    if action == 'update_basic':
        cambios = {}
        if 'nombre' in data:
            customer.nombre = data['nombre']
            cambios['nombre'] = data['nombre']
        if 'email' in data:
            email = str(data['email']).strip().lower()
            if Customer.query.filter(Customer.usuario_id == user_id, Customer.email == email,
                                     Customer.id != customer_id).first():
                return jsonify({"error": "El email ya está en uso por otro de tus clientes"}), 400
            customer.email = email
            cambios['email'] = email
        if 'telefono' in data:
            if Customer.query.filter(Customer.usuario_id == user_id, Customer.telefono == data['telefono'],
                                     Customer.id != customer_id).first():
                return jsonify({"error": "El teléfono ya está en uso por otro de tus clientes"}), 400
            customer.telefono = data['telefono']
            cambios['telefono'] = data['telefono']

        customer.fecha_actualizacion = datetime.utcnow()
        db.session.add(InteraccionesCliente(
            cliente_id=customer_id, usuario_id=user_id, tipo_interaccion_id=TIPO_ACTUALIZACION,
            data_interaccion={"cambios": cambios}, fecha_creacion=datetime.utcnow()))
        db.session.commit()
        return jsonify({"message": "Información básica actualizada exitosamente", "fields_updated": cambios,
                        **_cliente_json(customer)}), 200

    if action == 'new_interaction':
        interaction_data = dict(data.get('data_interaccion') or {})
        monto = _monto(interaction_data.get('monto'))
        if monto is None:
            return jsonify({"error": "El monto de la compra debe ser un número mayor que 0"}), 400
        fecha_compra = _fecha(interaction_data.get('fecha_compra'))
        if fecha_compra is None:
            return jsonify({"error": "fecha_compra inválida (use AAAA-MM-DD HH:MM:SS)"}), 400
        if fecha_compra > datetime.utcnow() + timedelta(days=1):
            return jsonify({"error": "La fecha de compra no puede estar en el futuro"}), 400

        # Totales del cliente
        compras_previas = float(customer.total_compras or 0)
        customer.total_compras = compras_previas + 1
        customer.valor_medio_orden = (float(customer.valor_medio_orden or 0) * compras_previas + monto) / customer.total_compras
        if customer.ultima_compra is None or fecha_compra > customer.ultima_compra:
            customer.ultima_compra = fecha_compra   # una compra antigua no retrocede la última compra
        customer.frecuencia_compra = calculate_purchase_frequency(customer.fecha_creacion, fecha_compra,
                                                                  customer.total_compras)
        customer.fecha_actualizacion = datetime.utcnow()

        # La compra se guarda ANTES de predecir: los modelos v2 leen las compras de interacciones_cliente
        interaction_data.update({"monto": monto, "fecha_compra": fecha_compra.strftime("%Y-%m-%d %H:%M:%S")})
        interaction_data.pop("tipo_interaccion_id", None)
        db.session.add(InteraccionesCliente(
            cliente_id=customer_id, usuario_id=user_id, tipo_interaccion_id=TIPO_COMPRA,
            data_interaccion=interaction_data, fecha_creacion=fecha_compra))
        db.session.commit()

        _recalcular_ia(customer)
        return jsonify({"message": "Compra registrada exitosamente", **_cliente_json(customer)}), 200

    return jsonify({"error": "Acción no válida (use 'update_basic' o 'new_interaction')"}), 400


# ------------------------------------------------------------------ eliminar
@customer_bp.route('/delete/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    """Elimina el cliente con sus interacciones, métricas, predicciones y recomendaciones."""
    customer = _cliente_del_usuario(customer_id, _usuario_actual())
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    try:
        Prediccion.query.filter_by(cliente_id=customer_id).delete()
        MetricasHistoricas.query.filter_by(cliente_id=customer_id).delete()
        Recomendaciones.query.filter_by(cliente_id=customer_id).delete()
        InteraccionesCliente.query.filter_by(cliente_id=customer_id).delete()
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"message": "Cliente eliminado exitosamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar el cliente: {str(e)}"}), 500


# ------------------------------------------------------------------ consultar
@customer_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer_by_id(customer_id):
    customer = _cliente_del_usuario(customer_id, _usuario_actual())
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    return jsonify(_cliente_json(customer)), 200


@customer_bp.route('/<int:customer_id>/interacciones', methods=['GET'])
@jwt_required()
def get_interacciones(customer_id):
    """Interacciones del cliente (más recientes primero). Lista vacía si no tiene."""
    if not _cliente_del_usuario(customer_id, _usuario_actual()):
        return jsonify({"error": "Cliente no encontrado"}), 404
    interacciones = (InteraccionesCliente.query.filter_by(cliente_id=customer_id)
                     .order_by(InteraccionesCliente.fecha_creacion.desc()).all())
    return jsonify([{
        "id": i.id,
        "cliente_id": i.cliente_id,
        "usuario_id": i.usuario_id,
        "tipo_interaccion_id": i.tipo_interaccion_id,
        "data_interaccion": i.data_interaccion,
        "fecha_creacion": i.fecha_creacion.isoformat() if i.fecha_creacion else None,
    } for i in interacciones]), 200


@customer_bp.route('/metrics/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_metrics(customer_id):
    """Métricas históricas del cliente. Lista vacía si aún no tiene."""
    if not _cliente_del_usuario(customer_id, _usuario_actual()):
        return jsonify({"error": "Cliente no encontrado"}), 404
    metrics = (MetricasHistoricas.query.filter_by(cliente_id=customer_id)
               .order_by(MetricasHistoricas.fecha_registro).all())
    return jsonify([{
        "tipo_metrica": m.tipo_metrica,
        "valor": float(m.valor),
        "fecha_registro": m.fecha_registro.strftime("%Y-%m-%d"),
        "periodo": m.periodo,
    } for m in metrics]), 200


@customer_bp.route('/actividad-reciente', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Interacciones de los clientes del usuario en los últimos 7 días (más recientes primero)."""
    hace_7_dias = datetime.utcnow() - timedelta(days=7)
    filas = (db.session.query(InteraccionesCliente, Customer, TiposInteraccion)
             .join(Customer, InteraccionesCliente.cliente_id == Customer.id)
             .join(TiposInteraccion, InteraccionesCliente.tipo_interaccion_id == TiposInteraccion.id)
             .filter(Customer.usuario_id == _usuario_actual(), InteraccionesCliente.fecha_creacion >= hace_7_dias)
             .order_by(InteraccionesCliente.fecha_creacion.desc())
             .limit(100).all())
    return jsonify([{
        "cliente": cliente.nombre,
        "accion": tipo.nombre,
        "descripcion": interaccion.data_interaccion,
        "fecha": interaccion.fecha_creacion.strftime("%Y-%m-%d %H:%M:%S"),
    } for interaccion, cliente, tipo in filas]), 200
