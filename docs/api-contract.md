# Contrato API (borrador)

Base: `/api/v1` (futuro). Actual: prefijos existentes `/auth`, `/customer`, `/predictions`, `/recomendaciones`, `/trends`.

## Auth
- POST /auth/register
- POST /auth/login
- PUT /auth/update
- GET /auth/me

## Customer
- GET /customer/
- POST /customer/create
- PUT /customer/update/:id
- DELETE /customer/delete/:id
- GET /customer/:id
- GET /customer/:id/interacciones
- GET /customer/metrics/:id
- GET /customer/actividad-reciente

## Predictions
- GET /predictions/predict-churn
- GET /predictions/global/churn_avg
- POST /predictions/segment-clients

## Trends
- GET /trends/global/frecuencia_compra
- GET /trends/global/valor_medio_orden
- GET /trends/global/clientes_por_segmento
- GET /trends/customer/:id/frecuencia_compra
- GET /trends/customer/:id/valor_medio_orden

## Recommendations
- GET /recomendaciones/:id
"""