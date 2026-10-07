from flask import Flask
#from app import db
#from datetime import datetime
#from app.models.customer import Customer
#from app.services.segment_service import assign_segment_to_customer
#from app.services.metrics_service import update_metrics
from app.services.metrics_service import update_all_customer_metrics

# Importar el servicio de métricas dinámicas

def register_commands(app: Flask):

    # Comando para actualizar las métricas de todos los clientes
    @app.cli.command('update-all-metrics')
    def update_all_metrics_command():
        """
        Comando para actualizar las métricas de todos los clientes.
        """

        result = update_all_customer_metrics()
        print(result["message"])

    @app.cli.command('update-segments')
    def update_segments():
        """
        Actualiza los segmentos de clientes usando el modelo K-means.
        """
        from app.services.ia_service import assign_segments_to_customers
        try:
            assign_segments_to_customers()
            print("Segmentos actualizados exitosamente.")
        except Exception as e:
            print(f"Error al actualizar segmentos: {e}")


