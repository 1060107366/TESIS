from app import db
from datetime import datetime

class Segmento(db.Model):
    __tablename__ = 'segmentos'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(500), nullable=False)
    descripcion = db.Column(db.String(500), nullable=False)
    criterios = db.Column(db.JSON, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow)

    