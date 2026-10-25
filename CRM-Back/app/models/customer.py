from app import db
from datetime import datetime


class Customer(db.Model):
    __tablename__ = "clientes"
    # El correo es único dentro de cada tienda (usuario); creado por limpieza_bd.py
    __table_args__ = (db.UniqueConstraint('usuario_id', 'email', name='uq_clientes_usuario_email'),)

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    segmento_id = db.Column(db.Integer, db.ForeignKey('segmentos.id', ondelete='SET NULL'))
    nombre = db.Column(db.String(500), nullable=False)
    email = db.Column(db.String(500), nullable=False)
    ultima_compra = db.Column(db.DateTime, nullable=True)
    total_compras = db.Column(db.Float, default=0.0)
    frecuencia_compra = db.Column(db.Float, default=0.00)
    valor_medio_orden = db.Column(db.Float, default=0.0)
    probabilidad_churn = db.Column(db.Float, nullable=True)   # NULL = sin historial de compras
    valor_cliente = db.Column(db.Float, default=0.0)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow)
    telefono = db.Column(db.String(45), nullable=True)
    # Relaciones
    interacciones = db.relationship('InteraccionesCliente', backref='clientes')
    metricas = db.relationship('MetricasHistoricas', backref='clientes')
    segmento = db.relationship('Segmento', backref='clientes')


