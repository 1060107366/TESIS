
## **Requisitos Previos**
## prove git
Asegúrate de tener instalados los siguientes programas antes de comenzar con la configuración del proyecto:
- Python 3.13
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
    pip install -r requirements-notebooks.txt   # API + notebooks de IA (desarrollo)
    # o solo la API:  pip install -r requirements.txt
```
4. **Correr App/Backend**
Ejecuta el proyecto desde el archivo *run.py*
o ejecuta el comando:
>flask run

5. **Pruebas**
El notebook `crud_cliente.ipynb` y `docs/api-contract.md` describen las peticiones disponibles

# **Base de datos: mantenimiento y datos de demostración**
Scripts en `CRM-Back` (con el entorno virtual activado y MySQL encendido):

| Script | Qué hace |
|---|---|
| `python exportar_bd.py` | Exporta la estructura y los datos (con datos personales enmascarados) a `exportacion_bd/` para analizarlos |
| `python limpieza_bd.py` | **Simulación:** muestra qué limpiaría, sin cambiar nada |
| `python limpieza_bd.py --ejecutar` | Respaldo completo en `<bd>_respaldo_<fecha>` + limpieza + restricciones + recálculo de riesgo y segmentos. Deja un archivo `respaldo_<fecha>_RESTAURAR.sql` para volver atrás |
| `python cargar_demo.py` | Crea la tienda demo (`demo@tienda-demo.co` / `Demo2026*`) con 300 clientes y su historial real de compras (Online Retail II, en pesos, con nombres ficticios) |
| `python cargar_demo.py --reemplazar` | Borra la tienda demo y la vuelve a crear |
| `python seed.py` | Crea o actualiza los datos base: tipos de interacción, segmentos (nombres oficiales) y catálogo de recomendaciones |
| `python probar_api.py` | Con el backend corriendo, prueba todas las rutas (auth, customer, predictions, trends, recomendaciones) |

# **Módulos de IA**
Los dos modelos se preparan y entrenan con notebooks de Jupyter (por bloques) y la API los usa automáticamente.

| Módulo | Carpeta | Pasos |
|---|---|---|
| Predicción de abandono (churn) | `app/ia/churn_v2/` | Ejecutar `DataPrepare.ipynb` y luego `TrainModel.ipynb` |
| Segmentación de clientes (K-means RFM) | `app/ia/segmentacion/` | Ejecutar `DataPrepare.ipynb` y luego `TrainModel.ipynb` (después del de abandono) |

- **Datasets:** en `app/ia/datasets/` (Online Retail II y CDNOW).
- **Documentación:** en el `README.md` de cada carpeta. La ficha de cada modelo está en `modelos/v2.0.0/model_card.md`.

**Comandos útiles:**
```powershell
flask update-all-metrics     # recalcula métricas de clientes
flask churn-predict          # recalcula el riesgo de abandono de todos los clientes
flask update-segments        # recalcula los segmentos de todos los clientes
flask churn-monitor          # deriva de datos del modelo de abandono (PSI)
```

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
