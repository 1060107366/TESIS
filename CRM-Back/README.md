
## **Requisitos Previos**
## prove git
Asegúrate de tener instalados los siguientes programas antes de comenzar con la configuración del proyecto:
- Python 3.8 o superior
- MySQL
- Visual Studio Code

## **Configuración de la Base de Datos**
1. Abre MySQL Workbench y crea una nueva base de datos.
2. Actualiza la configuración de la base de datos en el archivo `config.py` con las credenciales y el nombre de la base de datos que acabas de crear.
3. Ejemplo:
```python
    #cambiar la ruta en confy.py
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://userio:contraseña@localhost/name_db.sql'
    #ejemplo SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123@localhost/crm_db'
```

## **Ejecución del Proyecto**
1. **crea entorno virtual**
```powershell
    python -m venv .venv
```
2. **activa entorno virtual**
```powershell
.venv\Scripts\activate.bat
```
3. **instala dependencias**
```powershell
    pip install -r requirements.txt
```
4. **Correr App/Backend**
Ejecuta el proyecto desde el archivo *run.py*
o ejecuta el comando:
>flask run

5. **Pruebas**
El archivo rutas.md contiene todas las peticiones disponibles
>rutas.md

# **Configuracion Modulos IA**
## **Churn**
### *Creacion de datos .csv*
>! La base de datos debe estar actualizada al modelo mas reciente
1. Ejecutar el notebook *DataPrepare.ipynb* para generar el archivo .csv que contiene los datos para el entrenamiento del modulo

>se optiene *Datos históricos exportados a app/ia/churn_model/data_export_churn_service.csv*

2. Cargar los datos *data_export_churn_service.csv* al modelo de entrenamiento y prediccion
>Ejecutar el archivo notebook *TrainModel.ipynb*

>La matriz de confucion, reporte de clasificacion y la precicion del modelo que debe de ser 1.0 = 100%

## **Actualizar metricas**
Ejecutar los siguientes comandos para actualizar las metricas de frecuencia y de mas:
```python
    flask update-all-metrics
```

## **Segmentacion**
### *Creacion de datos .csv*
>! La base de datos debe estar actualizada al modelo mas reciente
1. Ejecutar el notebook *DataPrepare_m1.ipynb* para generar el archivo .csv que contiene los datos para el entrenamiento del modulo

>se optiene *Datos históricos exportados a app/ia/segments/Data/kmeans_m1_data.csv*

2. Cargar los datos *kmeans_m1_data.csv* al modelo de entrenamiento
>Ejecutar el archivo notebook *segment.ipynb*

>se optiene:
- Resultados exportados a: Data\kmeans_segmented_results_m1.csv
- Modelo guardado en: Data\kmeans_model.pkl
- Scaler guardado en: Data\kmeans_scaler.pkl

## **Extensiones Recomendadas**
### *Extensiones de Visual Studio Code*
Para facilitar el desarrollo y mantener la consistencia en el proyecto, se recomienda instalar las siguientes extensiones en Visual Studio Code:

1. **Python** - Soporte para el desarrollo en Python.
2. **Flask Snippets** - Snippets útiles para el desarrollo con Flask.
3. **SQLAlchemy** - Snippets y soporte para SQLAlchemy.
4. **DotENV** - Soporte para archivos `.env`.
5. **Pylance** - Proporciona una mejor experiencia de desarrollo en Python con características avanzadas de IntelliSense.
6. **ESLint** - Para mantener la calidad del código y seguir las mejores prácticas.

Para instalar estas extensiones, puedes buscarlas en la barra de extensiones de Visual Studio Code o usar los siguientes comandos en la terminal de VS Code:

```sh
code --install-extension ms-python.python
code --install-extension cstrap.flask-snippets
code --install-extension dbaeumer.vscode-eslint
code --install-extension wholroyd.jinja
code --install-extension ms-python.vscode-pylance
code --install-extension mikestead.dotenv
```
