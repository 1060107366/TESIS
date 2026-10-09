from app import create_app, db
from app.models.tipo_interaccion import TiposInteraccion
from app.models.segmento import Segmento
from app.models.catalogo_recomendaciones import CatalogoRecomendaciones

app = create_app()

TIPOS = [
    (1, "Creación de cliente"),
    (2, "Compra"),
    (3, "Actualización de cliente"),
    (4, "Eliminación de cliente"),
]

SEGMENTOS = [
    (1, "Bajo valor"),
    (2, "Medio valor"),
    (3, "Alto valor"),
    (4, "Nuevos"),
]

CATALOGO = [
    # (segmento_id, tipo_recomendacion, reglas)
    (1, "Descuento de reactivación", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 1.0, "descuento": 20}),
    (2, "Descuento de fidelización", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 0.5, "descuento": 10}),
    (3, "Programa VIP", {"min_frecuencia_compra": 0, "max_probabilidad_churn": 0.3, "descuento": 5}),
]

with app.app_context():
    for id_, nombre in TIPOS:
        if not TiposInteraccion.query.get(id_):
            db.session.add(TiposInteraccion(id=id_, nombre=nombre))

    for id_, nombre in SEGMENTOS:
        if not Segmento.query.get(id_):
            db.session.add(Segmento(id=id_, nombre=nombre))

    for seg_id, tipo, reglas in CATALOGO:
        existe = CatalogoRecomendaciones.query.filter_by(segmento_id=seg_id, tipo_recomendacion=tipo).first()
        if not existe:
            db.session.add(CatalogoRecomendaciones(
                segmento_id=seg_id,
                tipo_recomendacion=tipo,
                reglas=reglas
            ))

    db.session.commit()
    print("✅ Datos sembrados correctamente.")