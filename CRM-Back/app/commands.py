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
        ok, mensaje = assign_segments_to_customers()
        print(mensaje if ok else f"Error al actualizar segmentos: {mensaje}")

    # ------------------------------------------------------------ modelo de abandono v2
    import json
    import click

    @app.cli.command('churn-predict')
    @click.option('--usuario', type=int, default=None, help='Solo los clientes de este usuario/tienda')
    def churn_predict(usuario):
        """Recalcula la probabilidad de abandono (modelo v2) y guarda el historial."""
        from app.ia.churn_v2 import servicio
        print(json.dumps(servicio.actualizar_probabilidades(usuario_id=usuario), indent=2, ensure_ascii=False))

    @app.cli.command('churn-monitor')
    @click.option('--usuario', type=int, default=None)
    def churn_monitor(usuario):
        """Reporte de deriva (PSI) frente a los datos de entrenamiento."""
        from app.ia.churn_v2 import servicio
        print(json.dumps(servicio.monitorear(usuario_id=usuario), indent=2, ensure_ascii=False))

    @app.cli.command('churn-recalibrate')
    @click.option('--corte', required=True, help='Fecha de corte AAAA-MM-DD (su ventana futura ya debe haber terminado)')
    @click.option('--usuario', type=int, default=None)
    def churn_recalibrate(corte, usuario):
        """Recalibra el modelo activo con las compras locales registradas en el CRM."""
        from app.ia.churn_v2 import servicio
        print(json.dumps(servicio.recalibrar_con_bd(corte, usuario_id=usuario), indent=2, ensure_ascii=False))

    # El entrenamiento se hace en los notebooks app/ia/churn_v2/DataPrepare.ipynb y TrainModel.ipynb


