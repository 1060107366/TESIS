from app import db
from datetime import datetime
from app.models.customer import Customer

class MetricasHistoricas(db.Model):

    __tablename__ = 'metricas_historicas'

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    tipo_metrica = db.Column(db.String(500), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    fecha_registro = db.Column(db.DateTime, nullable=False)
    periodo = db.Column(db.String(500), nullable=False)
    
    
