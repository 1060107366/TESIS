import joblib
import pandas as pd
import json
from app import db
from datetime import datetime
from app.models.customer import Customer
from app.models.segmento import Segmento

def prepare_churn_data(clientes, interacciones, metricas):
    """
    Prepara los datos necesarios para predecir churn.
    """
    datos = []
    for cliente in clientes:
        ultima_compra = cliente.ultima_compra

        # Manejar caso donde `ultima_compra` es None
        if ultima_compra is None:
            tiempo_desde_ultima_compra = -1  # Usamos -1 como indicador de que no hay compras
        else:
            tiempo_desde_ultima_compra = (datetime.utcnow() - ultima_compra).days

        # Convertir Decimal a float para operaciones matemáticas
        total_compras = float(cliente.total_compras)
        frecuencia_compra = float(cliente.frecuencia_compra)
        valor_medio_orden = float(cliente.valor_medio_orden)

        # Métrica: Actividad reciente (número de interacciones recientes)
        actividad_reciente = sum(
            1 for interaccion in interacciones if interaccion.cliente_id == cliente.id
        )

        # Métrica: Total de interacciones
        total_interacciones = sum(
            1 for interaccion in interacciones if interaccion.cliente_id == cliente.id
        )

        # Métrica adicional: Promedio mensual de compras
        promedio_mensual_compras = (
            total_compras / max(1, (datetime.utcnow() - cliente.fecha_creacion).days / 30)
        )

        # Agregar datos al DataFrame
        datos.append({
            "id": cliente.id,
            "time_since_last_purchase": tiempo_desde_ultima_compra,
            "purchase_frequency": frecuencia_compra,
            "average_order_value": valor_medio_orden,
            "total_purchases": total_compras,
            "recent_activity": actividad_reciente,
            "total_interactions": total_interacciones, 
            "monthly_avg_purchases": promedio_mensual_compras
        })

    # Convertir lista de datos a DataFrame
    return pd.DataFrame(datos)
 

def assign_segments_to_customers(customer_id=None):
    """
    Asigna segmentos a los clientes usando el modelo K-means entrenado.
    Incluye manejo especial para clientes nuevos o sin compras.
    """
    try:
        # Cargar modelo y scaler
        kmeans = joblib.load('app/ia/segments/Data/kmeans_model.pkl')
        scaler = joblib.load('app/ia/segments/Data/kmeans_scaler.pkl')

        # Consulta de clientes
        query = Customer.query.with_entities(
            Customer.id,
            Customer.total_compras,
            Customer.ultima_compra,
            Customer.fecha_creacion
        )
        
        if customer_id:
            query = query.filter(Customer.id == customer_id)
        
        customers = query.all()

        # Crear DataFrame
        customer_df = pd.DataFrame(customers, columns=[
            'id', 'total_compras', 'ultima_compra', 'fecha_creacion'
        ])

        # Preprocesamiento de fechas
        current_date = datetime.now()
        customer_df['ultima_compra'] = pd.to_datetime(customer_df['ultima_compra'], errors='coerce')
        customer_df['fecha_creacion'] = pd.to_datetime(customer_df['fecha_creacion'], errors='coerce')

        # Calcular métricas necesarias
        customer_df['dias_ultima_compra'] = (current_date - customer_df['ultima_compra']).dt.days.fillna(365)
        customer_df['dias_como_cliente'] = (current_date - customer_df['fecha_creacion']).dt.days.fillna(1)
        customer_df['frecuencia_compra'] = (customer_df['total_compras'] / (customer_df['dias_como_cliente'] / 30)).fillna(0)

        # Separar clientes nuevos/sin compras
        new_customers = customer_df[
            (customer_df['total_compras'] < 1)
        ]
        
        # Clientes regulares (con compras y más de 30 días)
        regular_customers = customer_df[
            (customer_df['total_compras'] > 0) 
        ]

        updates = []

        # Procesar clientes regulares con K-means
        if not regular_customers.empty:
            features = ['total_compras', 'frecuencia_compra', 'dias_ultima_compra']
            X = regular_customers[features]
            X_scaled = scaler.transform(X)
            predictions = kmeans.predict(X_scaled)

            # Mapear segmentos para clientes regulares
            segment_map = {
                0: 1,  # Bajo valor
                1: 2,  # Medio valor
                2: 3   # Alto valor
            }

            for i, row in regular_customers.iterrows():
                updates.append({
                    'id': row['id'],
                    'segmento_id': segment_map[predictions[i]]
                })

        # Asignar segmento 4 a clientes nuevos/sin compras
        for _, row in new_customers.iterrows():
            updates.append({
                'id': row['id'],
                'segmento_id': 4  # Segmento para clientes nuevos
            })

        # Actualizar en la base de datos
        try:
            if updates:
                db.session.bulk_update_mappings(Customer, updates)
                db.session.commit()
            return True, "Segmentos actualizados correctamente"
        except Exception as e:
            db.session.rollback()
            return False, f"Error al actualizar la base de datos: {str(e)}"

    except Exception as e:
        return False, f"Error en el proceso de segmentación: {str(e)}"