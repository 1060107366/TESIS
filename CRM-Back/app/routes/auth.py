from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from app import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__)

### Rutas de autenticación

# Registro de usuario
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Validar datos enviados
    if not data.get('usuario') or not data.get('email') or not data.get('contrasena'):
        return jsonify({"message": "Se requieren 'usuario', 'email' y 'contrasena'"}), 400

    if len(data['contrasena']) < 6: #tamaño de ta contraseña
        return jsonify({"message": "La contraseña debe tener al menos 6 caracteres"}), 400

    # Verificar si el email o usuario ya existe
    if User.query.filter((User.usuario == data['usuario']) | (User.email == data['email'])).first():
        return jsonify({"message": "El email o usuario ya está en uso"}), 400

    # Crear nuevo usuario
    new_user = User(
        usuario=data['usuario'],
        email=data['email'].lower()
    )
    new_user.set_password(data['contrasena'])

    try:
        db.session.add(new_user)
        db.session.commit()

        # Generar un token de acceso para el nuevo usuario
        access_token = create_access_token(identity=str(new_user.id), expires_delta=timedelta(hours=3))

        # Retornar una respuesta
        return jsonify({
            "message": "Usuario registrado exitosamente",
            "access_token": access_token,
            "user": {
                "id": new_user.id,
                "usuario": new_user.usuario,
                "email": new_user.email
            },
            "customers": {
                "clientes": [],
                "total_clientes": 0
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error al registrar usuario: {str(e)}"}), 500

# Iniciar sesión
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Validar datos enviados
    if not data.get('email') or not data.get('contrasena'):
        return jsonify({"message": "Se requieren 'email' y 'contrasena'"}), 400

    # Buscar usuario por email
    user = User.query.filter_by(email=data['email'].lower()).first()

    # Verificar credenciales
    if not user or not user.check_password(data['contrasena']):
        return jsonify({"message": "Credenciales incorrectas"}), 401

    # Generar token de acceso
    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=3))
    return jsonify({"access_token": access_token}), 200


# Actualizar usuario
@auth_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_user():
    user_id = get_jwt_identity()

    # Obtener datos enviados
    data = request.get_json()
    user = User.query.get(user_id)

    # Verificar si el usuario existe
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    # Validar campos opcionales
    if 'email' in data:
        if User.query.filter(User.email == data['email'], User.id != user_id).first():
            return jsonify({"error": "El email ya está registrado"}), 400
        user.email = data['email']

    if 'usuario' in data:
        if User.query.filter(User.usuario == data['usuario'], User.id != user_id).first():
            return jsonify({"error": "El nombre de usuario ya está en uso"}), 400
        user.usuario = data['usuario']

    if 'contrasena' in data:
        if len(data['contrasena']) < 6:
            return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400
        user.set_password(data['contrasena'])

    db.session.commit()
    return jsonify({"message": "Usuario actualizado exitosamente"}), 200

# Obtener información del usuario
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user_info():
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({
        "id": user.id,
        "usuario": user.usuario,
        "email": user.email
    }), 200
