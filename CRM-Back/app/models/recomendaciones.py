from app import db
from datetime import datetime

class Recomendaciones(db.Model):
    __tablename__ = 'recomendaciones'

    id = db.Column(db.Integer, primary_key=True)

    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'))
    catalogo_recomendacion_id = db.Column(db.Integer, db.ForeignKey('catalogo_recomendaciones.id'))

    data_recomendacion = db.Column(db.JSON, nullable=False)
    aplicada = db.Column(db.Boolean, default=False, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    cliente = db.relationship('Customer', backref='recomendaciones')
    catalogo = db.relationship('CatalogoRecomendaciones', backref='recomendaciones')
