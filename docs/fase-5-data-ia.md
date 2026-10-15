# Fase 5 - Datos válidos y precisión de IA

## Objetivos

- Reemplazar datos de prueba inconsistentes por datos válidos o semilla coherente.
- Evaluar modelos de churn y segmentación (entrenamiento/validación).
- Reportar métricas y umbrales para decisiones operativas.

## Métricas propuestas

- Churn: accuracy, precision, recall, F1, AUC-ROC.
- Segmentación: silhouette score, inercia, distribución por segmento.
- Negocio: clientes en riesgo (>0.50), clientes por segmento, valor medio.

## Entregables

- Script de evaluación en `CRM-Back` (`eval/churn_eval.py`, `eval/segment_eval.py`).
- Reporte en `docs/model-evaluation.md`.
- Configuración de umbral churn (0.50 inicial) documentado.
- Checklist para carga de datos reales y validaciones.
"""