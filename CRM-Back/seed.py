"""
Datos base del CRM: tipos de interacción, segmentos y catálogo de recomendaciones.

Uso:  python seed.py
Se puede ejecutar las veces que quiera: crea lo que falte y actualiza nombres y
descripciones de lo que ya existe (no borra clientes ni recomendaciones).

Los nombres de segmento son los mismos que usan el frontend y los modelos de IA.
"""
from datetime import datetime

from app import create_app, db
from app.models.tipo_interaccion import TiposInteraccion
from app.models.segmento import Segmento
from app.models.catalogo_recomendaciones import CatalogoRecomendaciones

TIPOS = [  # (id, nombre, descripción, requiere seguimiento)
    (1, "Creación de cliente", "Registro de un cliente nuevo", True),
    (2, "Compra", "Compra registrada (monto y fecha en data_interaccion)", False),
    (3, "Actualización de cliente", "Cambio en los datos básicos del cliente", False),
    (4, "Eliminación de cliente", "El cliente fue eliminado del sistema", False),
]

SEGMENTOS = [  # (id, nombre, descripción, criterios)
    (1, "Bajo valor", "Compra poco, hace tiempo y gasta menos que el cliente típico de la tienda",
     {"modelo": "K-means RFM v2", "nivel": "bajo"}),
    (2, "Medio valor", "Compra con frecuencia o gasto moderados; incluye clientes recientes y clientes en pausa",
     {"modelo": "K-means RFM v2", "nivel": "medio"}),
    (3, "Alto valor", "Compra seguido, recientemente y gasta varias veces más que el cliente típico",
     {"modelo": "K-means RFM v2", "nivel": "alto"}),
    (4, "Nuevos", "Clientes registrados que todavía no tienen compras",
     {"regla": "sin compras registradas"}),
]

CATALOGO = [  # (segmento_id, tipo_recomendacion, reglas)
    (1, "Descuento de reactivación", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 1.0, "descuento": 20}),
    (2, "Descuento de fidelización", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 0.5, "descuento": 10}),
    (3, "Programa VIP", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 0.3, "descuento": 5}),
    (4, "Bono de bienvenida en la primera compra", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 1.0,
                                                    "descuento": 10}),
]


def sembrar():
    ahora = datetime.utcnow()
    cambios = {"creados": 0, "actualizados": 0}

    for id_, nombre, descripcion, seguimiento in TIPOS:
        t = db.session.get(TiposInteraccion, id_)
        if t is None:
            db.session.add(TiposInteraccion(id=id_, nombre=nombre, descripcion=descripcion,
                                            requiere_seguimiento=seguimiento, fecha_creacion=ahora))
            cambios["creados"] += 1
        elif (t.nombre, t.descripcion) != (nombre, descripcion):
            t.nombre, t.descripcion = nombre, descripcion
            cambios["actualizados"] += 1

    for id_, nombre, descripcion, criterios in SEGMENTOS:
        s = db.session.get(Segmento, id_)
        if s is None:
            db.session.add(Segmento(id=id_, nombre=nombre, descripcion=descripcion, criterios=criterios,
                                    fecha_creacion=ahora, fecha_actualizacion=ahora))
            cambios["creados"] += 1
        elif (s.nombre, s.descripcion) != (nombre, descripcion):
            s.nombre, s.descripcion, s.criterios, s.fecha_actualizacion = nombre, descripcion, criterios, ahora
            cambios["actualizados"] += 1
    db.session.flush()

    for seg_id, tipo, reglas in CATALOGO:
        c = CatalogoRecomendaciones.query.filter_by(segmento_id=seg_id, tipo_recomendacion=tipo).first()
        if c is None:
            db.session.add(CatalogoRecomendaciones(segmento_id=seg_id, tipo_recomendacion=tipo, reglas=reglas,
                                                   fecha_creacion=ahora))
            cambios["creados"] += 1
        elif c.reglas != reglas:
            c.reglas = reglas
            cambios["actualizados"] += 1

    db.session.commit()
    return cambios


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        print("✅ Datos base listos:", sembrar())
