from app import db
from datetime import datetime

class CatalogoRecomendaciones(db.Model):
    __tablename__ = 'catalogo_recomendaciones'

    id = db.Column(db.Integer, primary_key=True)
    segmento_id = db.Column(db.Integer, db.ForeignKey('segmentos.id'))
    tipo_recomendacion = db.Column(db.String(500), nullable=False)
    reglas = db.Column(db.JSON, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)