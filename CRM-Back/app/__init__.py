from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask
from flask import request, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Inicializar extensiones
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    app.config.from_object('app.config.Config')

    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # Configuración de CORS
    cors_config = {
        "origins": [frontend_url],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        "supports_credentials": True,
        "expose_headers": ["Content-Range", "X-Content-Range"],
        "max_age": 600
    }

    # Inicializar CORS con la configuración
    CORS(app, resources={
        r"/auth/*": cors_config,
        r"/customer/*": cors_config,
        r"/predictions/*": cors_config,
        r"/recomendaciones/*": cors_config,   # ← corregido (decía /segments/*)
        r"/trends/*": cors_config
    })

    # Inicializar extensiones con la aplicación
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Registrar rutas
    from app.routes.auth import auth_bp
    from app.routes.customer import customer_bp
    from app.routes.predictions import predictions_bp
    from app.routes.recommendations import recommendations_bp
    from app.routes.trends import trends_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(predictions_bp, url_prefix='/predictions')
    app.register_blueprint(recommendations_bp, url_prefix='/recomendaciones')
    app.register_blueprint(trends_bp, url_prefix='/trends')

    # Registrar comandos CLI
    from app.commands import register_commands
    register_commands(app)

    return app
