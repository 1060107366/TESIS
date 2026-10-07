from .auth import auth_bp
from .customer import customer_bp
from .predictions import predictions_bp

def register_blueprints(app):
    """
    Registra todos los Blueprints de la aplicación.
    """
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(predictions_bp, url_prefix='/predictions')
