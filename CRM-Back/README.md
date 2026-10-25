# CRM-Back

API del CRM con IA para MiPyMEs. Está hecha con Flask y MySQL y tiene dos modelos de inteligencia artificial:

- **Riesgo de abandono (churn v2):** la probabilidad de que un cliente no vuelva a comprar en los próximos 90 días, y por qué.
- **Tipos de cliente (K-means RFM v2):** agrupa a los clientes en Bajo valor, Medio valor, Alto valor y Nuevos.

Los modelos ya vienen entrenados en el repositorio, así que no hace falta entrenarlos para usar la API.

---

## Instalación desde cero (Windows)

### 1. Requisitos

| Programa | Versión | Para qué |
|---|---|---|
| Python | 3.13 | Ejecutar la API (marque *Add python.exe to PATH* al instalar) |
| MySQL Server + MySQL Workbench | 8 o superior | Base de datos |
| Git | cualquiera | Descargar el proyecto |
| Node.js | 20 o superior | Solo para el frontend (`CRM-Front`) |

### 2. Descargar el proyecto

```powershell
git clone https://github.com/1060107366/TESIS.git
cd TESIS\CRM-Back
```

### 3. Crear la base de datos vacía

En MySQL Workbench, conéctese a `localhost:3306` y ejecute:

```sql
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

Solo se crea la base. Las tablas las crea el paso 6.

### 4. Crear el entorno virtual e instalar las dependencias

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si además va a ejecutar los notebooks de IA, use `pip install -r requirements-notebooks.txt`. Incluye todo lo anterior más matplotlib y Jupyter.

> Si PowerShell no deja activar el entorno, ejecute una sola vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o use `.venv\Scripts\activate.bat` desde CMD.

### 5. Configurar las variables de entorno

```powershell
copy .env.example .env
```

Abra `.env` y cambie:

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` | `mysql+pymysql://USUARIO:CONTRASEÑA@localhost:3306/crm_db`, con su usuario y contraseña de MySQL |
| `SECRET_KEY` y `JWT_SECRET_KEY` | Dos claves distintas. Genere cada una con `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | `http://localhost:5173` (la dirección del frontend) |

El archivo `.env` nunca se sube a GitHub.

### 6. Crear las tablas y los datos base

```powershell
python seed.py
```

Este paso:

- crea las 9 tablas;
- carga los tipos de interacción;
- carga los 4 tipos de cliente (segmentos);
- carga el catálogo de ofertas.

Se puede ejecutar varias veces sin dañar nada.

### 7. Cargar la tienda de demostración (recomendado)

```powershell
python cargar_demo.py
```

Crea un usuario con 300 clientes y su historial real de compras. Los datos vienen del dataset Online Retail II, convertidos a pesos y con nombres ficticios. Al final calcula el riesgo y el tipo de cada cliente.

- **Usuario:** `demo@tienda-demo.co`
- **Contraseña:** `Demo2026*`

Para borrar la tienda demo y volver a crearla: `python cargar_demo.py --reemplazar`.

### 8. Arrancar la API

```powershell
python run.py
```

La API queda en **http://localhost:5001**. Déjela abierta mientras use el CRM.

### 9. Comprobar que todo funciona

En **otra** terminal (con el entorno activado y la API corriendo):

```powershell
cd TESIS\CRM-Back
.venv\Scripts\activate
python probar_api.py
```

Debe terminar con `Resultado: 59/59 pruebas correctas`. Prueba registro e inicio de sesión, clientes, compras, riesgo de abandono, tipos de cliente, tendencias, ofertas y que una tienda no pueda ver los clientes de otra.

### 10. Conectar el frontend

Siga el `README.md` de `CRM-Front`: `npm install` y luego `npm run dev`. Después abra http://localhost:5173 e ingrese con el usuario demo.

---

## Uso diario

```powershell
cd TESIS\CRM-Back
.venv\Scripts\activate
python run.py
```

## Comandos de mantenimiento

Ejecútelos con el entorno activado, desde `CRM-Back`:

| Comando | Qué hace |
|---|---|
| `flask churn-predict` | Recalcula el riesgo de abandono de todos los clientes |
| `flask update-segments` | Recalcula el tipo de cliente (segmento) de todos |
| `flask update-all-metrics` | Recalcula las métricas de compra de cada cliente |
| `flask churn-monitor` | Revisa si los clientes actuales se parecen a los datos con que se entrenó el modelo (PSI) |
| `flask churn-recalibrate --corte AAAA-MM-DD --usuario ID` | Ajusta el modelo de abandono a las ventas reales de una tienda |

La API también recalcula el riesgo y el tipo de un cliente cada vez que se le registra una compra.

## Módulos de IA (reentrenamiento opcional)

| Módulo | Carpeta | Cómo reentrenar |
|---|---|---|
| Riesgo de abandono | `app/ia/churn_v2/` | Ejecutar `DataPrepare.ipynb` y luego `TrainModel.ipynb` |
| Tipos de cliente | `app/ia/segmentacion/` | Ejecutar `DataPrepare.ipynb` y luego `TrainModel.ipynb` (después del de abandono) |

- Los datasets están en `app/ia/datasets/` (Online Retail II, CDNOW y los datos del modelo v1).
- Cada modelo entrenado queda en `modelos/<versión>/`, con `modelo.pkl`, `metricas.json` y `model_card.md`. El archivo `modelos/ACTUAL` indica qué versión usa la API.
- El `README.md` de cada carpeta explica el método y los resultados.

## Estructura

```
CRM-Back/
  run.py                 arranca la API
  seed.py                crea las tablas y los datos base
  cargar_demo.py         tienda de demostración con 300 clientes
  probar_api.py          prueba automática de todas las rutas
  app/
    __init__.py          crea la aplicación (CORS, JWT, errores en JSON)
    config.py            lee las variables del .env
    models/              tablas de la base de datos
    routes/              rutas: auth, customer, predictions, recomendaciones, trends
    services/            lógica de métricas, IA y recomendaciones
    commands.py          comandos flask de mantenimiento
    ia/churn_v2/         modelo de riesgo de abandono
    ia/segmentacion/     modelo de tipos de cliente
  requirements.txt             dependencias de la API
  requirements-notebooks.txt   dependencias para los notebooks
  Dockerfile                   imagen de producción (gunicorn)
```

El detalle de cada ruta (qué recibe y qué responde) está en `docs/api-contract.md`, en la raíz del repositorio.

## Con Docker (opcional)

```powershell
docker build -t crm-back .
docker run -p 5001:5001 --env-file .env crm-back
```

Dentro del contenedor, `localhost` es el propio contenedor. Si MySQL está en su equipo, use `host.docker.internal` en `DATABASE_URL`. Las tablas y los datos base se crean igual: ejecute `python seed.py` una vez desde su equipo.

## Problemas comunes

| Mensaje | Solución |
|---|---|
| `KeyError: 'SECRET_KEY'` | Falta el archivo `.env` o la variable dentro de él (paso 5) |
| `Access denied for user` | Usuario o contraseña de MySQL incorrectos en `DATABASE_URL` |
| `Unknown database 'crm_db'` | No creó la base de datos (paso 3) o el nombre no coincide |
| `Can't connect to MySQL server` | MySQL no está encendido (Servicios de Windows → MySQL80 → Iniciar) |
| `ModuleNotFoundError` | El entorno virtual no está activado o faltó `pip install -r requirements.txt` |
| El frontend muestra error de CORS | `FRONTEND_URL` no coincide con la dirección del frontend |
| `probar_api.py` falla en el inicio de sesión demo | Falta ejecutar `python cargar_demo.py` |
