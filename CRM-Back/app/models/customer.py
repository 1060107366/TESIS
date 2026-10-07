from app import db
from datetime import datetime


class Customer(db.Model):
    __tablename__ = "Clientes"

    id = db.Column(db.Integer, primary_key=True)
    segmento_id = db.Column(db.Integer, db.ForeignKey('Segmentos.id'))
    nombre = db.Column(db.String(500), nullable=False)
    email = db.Column(db.String(500), nullable=False, unique=True)
    ultima_compra = db.Column(db.DateTime, nullable=True)
    total_compras = db.Column(db.Float, default=0.0)
    frecuencia_compra = db.Column(db.Float, default=0.00)
    valor_medio_orden = db.Column(db.Float, default=0.0)
    probabilidad_churn = db.Column(db.Float, default=0.000)
    valor_cliente = db.Column(db.Float, default=0.0)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow)
    telefono = db.Column(db.String(500), nullable=True)

    # Relaciones
    interacciones = db.relationship('InteraccionesCliente', backref='Clientes')
    metricas = db.relationship('MetricasHistoricas', backref='Clientes')
    segmento = db.relationship('Segmento', backref='Clientes')


