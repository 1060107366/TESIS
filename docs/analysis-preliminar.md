# Análisis preliminar de acoplamiento frontend-backend

## Resumen

- Backend: Flask con JWT, blueprints en `/auth`, `/customer`, `/predictions`, `/recomendaciones`, `/trends`.
- Frontend: React + Zustand. CRUD y auth consumen backend; dashboard y análisis usan mocks.
- DB: MySQL en localhost:3306.

## Inconsistencias principales

1. Puerto frontend `5001` vs backend Flask `5000`.
2. Frontend no consume predictions/trends/recomendaciones.
3. Stores de Dashboard/Análisis usan mock data.
4. `/auth/logout` no existe en backend.
5. `/auth/me` recibe body en GET (frontend).
6. `predict_churn_for_customer` no está expuesto como endpoint.
7. Verificar claves de respuesta backend vs frontend (`clientes`, etc.).
8. Prefijo `/recomendaciones` (español) vs convención `/recommendations`.
"""