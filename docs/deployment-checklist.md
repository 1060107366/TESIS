# Checklist de despliegue

## Backend
- Configurar variables de entorno (SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, PORT).
- Ejecutar migraciones.
- Verificar CORS para frontend URL.
- Confirmar modelos IA en rutas esperadas.

## Frontend
- Configurar VITE_API_URL.
- Ejecutar build y verificar assets.
- Revisar rutas protegidas.

## General
- Ejecutar smoke tests (login, CRUD, detalles, dashboard).
- Verificar logs de errores.
- Tag de release.
"""