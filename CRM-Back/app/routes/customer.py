import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.routes.predictions import predict_churn_for_customer
from app.models.predicciones import Prediccion
from app.models.customer import Customer
from app.models.metricas_historicas import MetricasHistoricas
from app.models.recomendaciones import Recomendaciones
from app.models.tipo_interaccion import TiposInteraccion
from app.models.interacciones_cliente import InteraccionesCliente
from app.services.customer_service import create_customer
from app.services.recommendation_service import generate_recommendations
from app.services.metrics_service import calculate_purchase_frequency, update_metrics
from app.services.ia_service import assign_segments_to_customers
from app import db

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/create', methods=['POST'])
@jwt_required()
def create_customer_endpoint():
    """
    Endpoint para crear un cliente. Registra también una compra inicial si se proporciona `valor_orden_total`.
    """
    user_id = get_jwt_identity()  # ID del usuario autenticado
    data = request.get_json()

    # Validar datos requeridos
    required_fields = ["nombre", "email", "telefono"]
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        return jsonify({"error": f"Faltan campos requeridos: {', '.join(missing_fields)}"}), 400

    try:
        new_cliente = create_customer(data)

        # Interacción de creación
        db.session.add(InteraccionesCliente(
            cliente_id=new_cliente.id,
            usuario_id=user_id,
            tipo_interaccion_id=1,
            data_interaccion={"accion": "Creación de cliente", "estado": "completado"},
            fecha_creacion=datetime.utcnow()
        ))

        # Compra inicial (opcional)
        valor_orden_total = data.get('valor_orden_total')
        if valor_orden_total:
            new_cliente.total_compras += 1
            new_cliente.valor_medio_orden = valor_orden_total  # 1ª compra: promedio = monto
            new_cliente.ultima_compra = datetime.utcnow()

            db.session.add(InteraccionesCliente(   # ← AHORA SÍ se agrega
                cliente_id=new_cliente.id,
                usuario_id=user_id,
                tipo_interaccion_id=2,
                data_interaccion={
                    "accion": "Compra inicial",
                    "monto": valor_orden_total,
                    "estado": "completado"
                },
                fecha_creacion=datetime.utcnow()
            ))

        db.session.commit()  # ← un solo commit

        # Procesos pesados DESPUÉS del commit (si fallan, el cliente ya existe)
        update_metrics(new_cliente)
        assign_segments_to_customers(new_cliente.id)
        generate_recommendations(new_cliente.id)

        return jsonify({
            "message": "Cliente creado exitosamente",
            "cliente_id": new_cliente.id,
            "nombre": new_cliente.nombre,
            "email": new_cliente.email,
            "ultima_compra": new_cliente.ultima_compra.isoformat() if new_cliente.ultima_compra else None
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear cliente: {str(e)}"}), 500


# Obtener clientes
@customer_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    """
    Obtiene la lista de clientes asociados al usuario autenticado.
    """
    user_id = get_jwt_identity()

    # Obtener los IDs de clientes asociados al usuario autenticado
    customer_ids = db.session.query(InteraccionesCliente.cliente_id).filter_by(usuario_id=user_id).distinct().all()
    
    # Convertir los resultados en una lista de IDs
    customer_ids = [customer_id[0] for customer_id in customer_ids]

    # Buscar los clientes correspondientes
    customers = Customer.query.filter(Customer.id.in_(customer_ids)).all()

    # Verificar si hay clientes
    if not customers:
        return jsonify({
            "total_clientes": 0,
            "clientes": []
        }), 200 # Cambiado de 404 a 200 para manejar el caso vacío como válido

    # Retornar los datos de los clientes en formato JSON
    customer_data = [
        {
            "id": customer.id,
            "nombre": customer.nombre,
            "email": customer.email,
            "telefono": customer.telefono,
            "ultima_compra": customer.ultima_compra.isoformat() if customer.ultima_compra else None,
            "total_compras": float(customer.total_compras),
            "frecuencia_compra": float(customer.frecuencia_compra),
            "valor_medio_orden": float(customer.valor_medio_orden),
            "probabilidad_churn": float(customer.probabilidad_churn),
            "valor_cliente": float(customer.valor_cliente),
        }
        for customer in customers
    ]

    # Retornar los datos junto con el número total de clientes
    return jsonify({
        "total_clientes": len(customers),
        "clientes": customer_data
    }), 200


# Actualizar cliente
@customer_bp.route('/update/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    """
    Actualiza la información de un cliente o registra una nueva interacción (como una compra).
    """
    user_id = get_jwt_identity()  # ID del usuario autenticado
    data = request.get_json()

    # Verificar si el cliente pertenece al usuario a través de interacciones
    interaction = InteraccionesCliente.query.filter_by(cliente_id=customer_id, usuario_id=user_id).first()
    if not interaction:
        return jsonify({"error": "No tienes permiso para actualizar este cliente"}), 403

    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404

    # Obtener el tipo de acción
    action = data.get('action', 'update_basic')  # Puede ser 'update_basic' o 'new_interaction'

    # Acción: Actualizar información básica del cliente
    if action == 'update_basic':
        fields_to_update = {}

        if 'nombre' in data:
            customer.nombre = data['nombre']
            fields_to_update['nombre'] = data['nombre']
        if 'email' in data:
            # Verificar si el email ya está en uso por otro cliente
            if Customer.query.filter(Customer.email == data['email'], Customer.id != customer_id).first():
                return jsonify({"error": "El email ya está en uso"}), 400
            customer.email = data['email']
            fields_to_update['email'] = data['email']
        if 'telefono' in data:
            # Verificar si el teléfono ya está en uso por otro cliente
            if Customer.query.filter(Customer.telefono == data['telefono'], Customer.id != customer_id).first():
                return jsonify({"error": "El teléfono ya está en uso"}), 400
            customer.telefono = data['telefono']
            fields_to_update['telefono'] = data['telefono']

        # Actualizar fecha de modificación
        customer.fecha_actualizacion = datetime.utcnow()
        db.session.commit()

        # Registrar la interacción de actualización
        nueva_interaccion = InteraccionesCliente(
            cliente_id=customer_id,
            usuario_id=user_id,
            tipo_interaccion_id=3,  # ID 3 para "Actualización de cliente"
            data_interaccion={"cambios": fields_to_update},
            fecha_creacion=datetime.utcnow()
        )
        db.session.add(nueva_interaccion)
        db.session.commit()

        return jsonify({
            "message": "Información básica actualizada exitosamente",
            "fields_updated": fields_to_update
        }), 200
    
    # Acción: Registrar una nueva interacción (como una compra)
    elif action == 'new_interaction':
        interaction_data = data.get('data_interaccion', {})
        nueva_compra = interaction_data.get('monto', 0)

        # Validar que la interacción es una compra válida
        if nueva_compra > 0:
            # Obtener fecha de compra proporcionada, o usar la fecha actual
            fecha_compra = interaction_data.get('fecha_compra')
            if fecha_compra:
                fecha_compra = datetime.strptime(fecha_compra, "%Y-%m-%d %H:%M:%S")
            else:
                fecha_compra = datetime.utcnow()

            # Actualizar valores del cliente por la compra
            customer.total_compras += 1
            suma_total_compras = customer.valor_medio_orden * (customer.total_compras - 1) + nueva_compra
            customer.valor_medio_orden = suma_total_compras / customer.total_compras
            customer.frecuencia_compra = calculate_purchase_frequency(customer.fecha_creacion, fecha_compra, customer.total_compras)
            customer.ultima_compra = fecha_compra
            customer.fecha_actualizacion = datetime.utcnow()

            # Calcular métricas actualizadas y registrar métricas históricas
            update_metrics(customer)

            # Reasignar segmento basado en los nuevos datos
            assign_segments_to_customers(customer_id)

            # Predecir churn para este cliente
            churn_prediction = predict_churn_for_customer(customer_id)

            #
            generate_recommendations(customer_id)

            if churn_prediction is not None:
                # Actualizar la probabilidad de churn en el cliente
                customer.probabilidad_churn = churn_prediction

                # Guardar predicción en la tabla de historial de predicciones
                prediction_entry = Prediccion(
                    cliente_id=customer.id,
                    tipo_prediccion="Probabilidad de Churn",
                    valor_prediccion=json.dumps({"probabilidad_churn": churn_prediction}),  # Convertir a JSON
                    fecha_creacion=datetime.utcnow(),
                    fecha_actualizacion=datetime.utcnow()
                )
                db.session.add(prediction_entry)

            # Registrar la interacción de compra
            new_interaction = InteraccionesCliente(
                cliente_id=customer_id,
                usuario_id=user_id,
                tipo_interaccion_id=data.get('tipo_interaccion_id', 2),  # Tipo predeterminado para "Compra"
                data_interaccion=interaction_data,
                fecha_creacion=datetime.utcnow()
            )
            db.session.add(new_interaction)

            # Confirmar todos los cambios en un solo commit
            db.session.commit()

            return jsonify({"message": "Compra registrada exitozamente"}), 200

    # Si la acción no es válida
    return jsonify({"error": "Acción no válida"}), 400



# Eliminar cliente
@customer_bp.route('/delete/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    """
    Elimina un cliente junto con todas sus métricas, interacciones y recomendaciones asociadas.
    """
    user_id = get_jwt_identity()  # ID del usuario autenticado

    # Verificar si el cliente pertenece al usuario
    interaction = InteraccionesCliente.query.filter_by(cliente_id=customer_id, usuario_id=user_id).first()
    if not interaction:
        return jsonify({"error": "No tienes permiso para eliminar este cliente"}), 403

    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404

    try:
        # Registrar una interacción de eliminación
        deletion_interaction = InteraccionesCliente(
            cliente_id=customer_id,
            usuario_id=user_id,
            tipo_interaccion_id=4,  # ID predefinido para "Eliminación de cliente"
            data_interaccion={"accion": "Eliminación de cliente", "estado": "completado"},
            fecha_creacion=datetime.utcnow()
        )
        db.session.add(deletion_interaction)

        # Eliminar predicciones relacionadas  ← NUEVO
        Prediccion.query.filter_by(cliente_id=customer_id).delete()

        # Eliminar métricas relacionadas
        MetricasHistoricas.query.filter_by(cliente_id=customer_id).delete()

        # Eliminar interacciones relacionadas
        InteraccionesCliente.query.filter_by(cliente_id=customer_id).delete()

        # Eliminar recomendaciones relacionadas
        Recomendaciones.query.filter_by(cliente_id=customer_id).delete()

        # Eliminar el cliente
        db.session.delete(customer)

        # Confirmar los cambios en la base de datos
        db.session.commit()

        return jsonify({"message": "Cliente eliminado exitosamente"}), 200

    except Exception as e:
        db.session.rollback()  # Revertir cualquier cambio en caso de error
        return jsonify({"error": f"Error al eliminar el cliente: {str(e)}"}), 500


# Obtener cliente por ID
@customer_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer_by_id(customer_id):
    """
    Obtiene los datos de un cliente específico por su ID.
    """

    user_id = get_jwt_identity()

    # Verificar si el cliente está asociado al usuario
    interaction = InteraccionesCliente.query.filter_by(cliente_id=customer_id, usuario_id=user_id).first()
    if not interaction:
        return jsonify({"error": "No tienes permiso para ver este cliente"}), 403

    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404

    # Retornar los datos del cliente
    return jsonify({
        "id": customer.id,
        "nombre": customer.nombre,
        "email": customer.email,
        "telefono": customer.telefono,
        "ultima_compra": customer.ultima_compra.isoformat() if customer.ultima_compra else None,
        "total_compras": float(customer.total_compras),
        "frecuencia_compra": float(customer.frecuencia_compra),
        "valor_medio_orden": float(customer.valor_medio_orden),
        "probabilidad_churn": float(customer.probabilidad_churn),
        "valor_cliente": float(customer.valor_cliente),
    }), 200


# Obtener interacciones de un cliente
@customer_bp.route('/<int:customer_id>/interacciones', methods=['GET'])
@jwt_required()
def get_interacciones(customer_id):
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()

    # Buscar el cliente por ID o por identificacion y verificar si pertenece al usuario autenticado
    customer = Customer.query.get(customer_id)

    if not customer:
        return jsonify({"message": "Cliente no encontrado"}), 404

    # Buscar las interacciones del cliente
    interacciones = InteraccionesCliente.query.filter_by(cliente_id=customer_id).all()

    if not interacciones:
        return jsonify({"message": "No se encontraron interacciones para este cliente"}), 404

    return jsonify([{
        "id": interaccion.id,
        "cliente_id": interaccion.cliente_id,
        "usuario_id": interaccion.usuario_id,
        "tipo_interaccion_id": interaccion.tipo_interaccion_id,
        "data_interaccion": interaccion.data_interaccion,
        "fecha_creacion": interaccion.fecha_creacion
    } for interaccion in interacciones]), 200


# Obtener métricas de un cliente
@customer_bp.route('/metrics/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_metrics(customer_id):
    from flask_jwt_extended import get_jwt_identity

    user_id = get_jwt_identity()

    # Verificar si el cliente pertenece al usuario
    interaction = InteraccionesCliente.query.filter_by(cliente_id=customer_id, usuario_id=user_id).first()
    if not interaction:
        return jsonify({"error": "No tienes permiso para ver las métricas de este cliente"}), 403

    # Obtener métricas del cliente
    metrics = MetricasHistoricas.query.filter_by(cliente_id=customer_id).all()
    if not metrics:
        return jsonify({"error": "No se encontraron métricas para este cliente"}), 404

    return jsonify([{
        "tipo_metrica": metric.tipo_metrica,
        "valor": float(metric.valor),
        "fecha_registro": metric.fecha_registro.strftime("%Y-%m-%d"),
        "periodo": metric.periodo
    } for metric in metrics]), 200

# Obtener actividad reciente
@customer_bp.route('/actividad-reciente', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """
    Obtiene la actividad reciente de los clientes del usuario autenticado en los últimos 7 días,
    mostrando las actualizaciones más recientes primero.
    """
    from datetime import datetime, timedelta

    user_id = get_jwt_identity()

    # Calcular el rango de fechas (últimos 7 días)
    fecha_hoy = datetime.utcnow()
    hace_7_dias = fecha_hoy - timedelta(days=7)

    # Obtener clientes e interacciones recientes en una sola consulta
    interacciones = db.session.query(
        InteraccionesCliente, Customer, TiposInteraccion
    ).join(
        Customer, InteraccionesCliente.cliente_id == Customer.id
    ).join(
        TiposInteraccion, InteraccionesCliente.tipo_interaccion_id == TiposInteraccion.id
    ).filter(
        InteraccionesCliente.usuario_id == user_id,
        InteraccionesCliente.fecha_creacion >= hace_7_dias
    ).order_by(
        InteraccionesCliente.fecha_creacion.desc()
    ).all()

    # Preparar la lista de actividades recientes
    recent_activity = []
    for interaccion, cliente, tipo_interaccion in interacciones:
        recent_activity.append({
            "cliente": cliente.nombre,
            "accion": tipo_interaccion.nombre,
            "descripcion": interaccion.data_interaccion,
            "fecha": interaccion.fecha_creacion.strftime("%Y-%m-%d %H:%M:%S")
        })

    if not recent_activity:
        return jsonify({"message": "No hay registro de actividades los últimos 7 días"}), 404

    return jsonify(recent_activity), 200
