from app import db
from datetime import datetime

class Prediccion(db.Model):
    __tablename__= 'predicciones'
 
    id = db.Column(db.Integer, primary_key=True)
    cliente_id= db.Column(db.Integer, db.ForeignKey('clientes.id'))
    tipo_prediccion = db.Column(db.String(500), nullable=False)
    valor_prediccion = db.Column(db.JSON, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow)
