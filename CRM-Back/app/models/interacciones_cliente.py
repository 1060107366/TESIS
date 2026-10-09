from app import db
from datetime import datetime
from app.models.customer import Customer

class InteraccionesCliente(db.Model):
    __tablename__ = 'interacciones_cliente'

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    tipo_interaccion_id = db.Column(db.Integer, db.ForeignKey('tipos_interaccion.id'), nullable=False)

    data_interaccion = db.Column(db.JSON, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    