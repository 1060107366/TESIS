# Fase 9 - Peticiones no consumidas y pruebas

## Peticiones backend no consumidas por frontend (al 15/10/2026)

- Predictions
  - POST /predictions/predict-churn (actualizacion masiva de churn)
  - POST /predictions/segment-clients (solo se llama manualmente, no en vistas)
- Trends
  - GET /trends/global/valor_medio_orden
  - GET /trends/customer/:id/frecuencia_compra
  - GET /trends/customer/:id/valor_medio_orden
- Recommendations
  - GET /recomendaciones/:id (servicio creado, sin vista dedicada)
- IA retraining
  - No existe endpoint para re entrenar, solo scripts/cuadernos.

## Pruebas con usuarios y varios clientes
- E2E: login, crear cliente, detalle, registrar compra, validar dashboard/analysis.
- Casos límite: cliente sin compras, sin interacciones, múltiples clientes.
- Carga: 10/50/100 clientes por usuario.

## Re entrenamiento con mayor volumen de datos
- Exportar dataset mayor (CSV desde DB).
- Versionar datasets y artefactos de modelo.
- Evaluar métricas y umbrales.
- Programar retraining periódico.
"""