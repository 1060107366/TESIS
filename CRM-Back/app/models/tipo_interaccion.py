from app import db
from datetime import datetime

class TiposInteraccion(db.Model):

    __tablename__ = "Tipos_interaccion"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(500), nullable=False)
    descripcion = db.Column(db.String(500), nullable=False)
    requiere_seguimiento = db.Column(db.Boolean, default=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    