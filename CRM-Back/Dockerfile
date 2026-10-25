FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias primero (mejor caché). Solo las de la API: los notebooks no se ejecutan en el contenedor.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Código y modelos entrenados (ver .dockerignore: no se copian .env, datasets ni datos de los notebooks)
COPY . .

# Usuario no-root
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Variables requeridas en tiempo de ejecución: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, FRONTEND_URL
EXPOSE 5001
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "app:create_app()"]
