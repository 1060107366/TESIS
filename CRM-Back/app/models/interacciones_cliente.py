from app import db
from datetime import datetime
from app.models.customer import Customer

class InteraccionesCliente(db.Model):
    __tablename__ = 'Interacciones_cliente'

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('Clientes.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('Usuario.id'), nullable=False)
    tipo_interaccion_id = db.Column(db.Integer, db.ForeignKey('Tipos_interaccion.id'), nullable=False)
    
    data_interaccion = db.Column(db.JSON, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    