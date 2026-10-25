# Plan de trabajo: CRM con módulos de IA (estado al 25/10/2026)

Este documento reemplaza a `nueva-lista-fases.md`, `fase-6-plan.md`, `fase-7-db.md`, `fase-8-acople.md` y `fase-9-peticiones-pruebas.md`.

Leyenda: ✅ hecho · 🟡 parcial / por verificar · ⬜ pendiente

## 1. Modelos de IA
| Tarea | Estado | Dónde |
|---|---|---|
| Modelo de abandono sin fuga de datos (etiqueta con fecha de corte, split temporal, calibración) | ✅ | `CRM-Back/app/ia/churn_v2/` |
| Segmentación K-means RFM usada por la app (antes se usaban reglas de percentiles) | ✅ | `CRM-Back/app/ia/segmentacion/` |
| Preparación y entrenamiento por notebooks, con criterios de aceptación | ✅ | `DataPrepare.ipynb` / `TrainModel.ipynb` de cada carpeta |
| Fichas de los modelos (model cards) con métricas | ✅ | `modelos/v2.0.0/model_card.md` |
| Historial de predicciones (`predicciones`) con versión del modelo | ✅ | API |
| Datos de demostración realistas (300 clientes, compras reales) para probar los modelos | ✅ | `cargar_demo.py` |
| Monitoreo de deriva (PSI) del modelo de abandono | ✅ | `GET /predictions/churn/monitoreo`, `flask churn-monitor` |
| Recalibración con datos locales | ✅ | `flask churn-recalibrate` (requiere ≥ 50 casos por clase) |
| Programar `flask churn-predict` y `flask update-segments` mensualmente | ⬜ | Servidor (cron / tarea programada) |

## 2. Base de datos y contrato de datos
| Tarea | Estado | Nota |
|---|---|---|
| Relación cliente → usuario (`clientes.usuario_id`) | ✅ | Migración `4eaedf85886d` |
| `metricas_historicas.valor` como DECIMAL(10,2) | 🟡 | El modelo ya lo define así; verificar la columna real en MySQL |
| Compras con fecha real en `data_interaccion.fecha_compra` | ✅ | Necesario para los modelos |
| `seed.py` completo e idempotente (descripciones, criterios, nombres oficiales de segmento) | ✅ | `python seed.py` |
| Unificar nomenclatura `usuario` vs `users` en la documentación | ⬜ | |
| Limpieza de datos de prueba, duplicados, tablas backup y columnas viejas; restricciones únicas | ✅ | `limpieza_bd.py` (con respaldo) |
| Documentar migraciones y rollback | ⬜ | |

## 3. Acople frontend ↔ backend
| Tarea | Estado | Nota |
|---|---|---|
| Dashboard y Análisis con datos reales (sin mocks) | ✅ | `DashboardStore`, `AnalisysStore` |
| Puerto del backend unificado (5001) | ✅ | `run.py`, `config.js` |
| Logout local (el backend no expone `/auth/logout`) | ✅ | `authApiService` |
| Mostrar en el detalle del cliente las **razones del riesgo** y el **perfil de segmento** | ⬜ | Consumir `GET /predictions/churn/<id>` y `GET /predictions/segmentos/cliente/<id>` |
| Mostrar en Análisis la versión y métricas de los modelos y el resumen por segmento | ⬜ | `GET /predictions/churn/modelo`, `/segmentos/modelo`, `/segmentos/resumen` |
| Lista priorizada "alto valor + riesgo alto" para el dueño | ⬜ | Cruzar segmento y nivel de riesgo |
| Cambiar la llamada de `predictChurnAll` de GET a POST | ⬜ | El backend acepta ambos |
| Recomendaciones: evitar duplicados al regenerarlas | ✅ | Se actualizan; restricción única cliente + catálogo |

## 4. Pruebas
| Tarea | Estado | Nota |
|---|---|---|
| Plan de pruebas con usuarios y clientes | ✅ | `plan-pruebas-usuarios-clientes.md` |
| Verificaciones de fuga y de no regresión dentro de los notebooks | ✅ | |
| Prueba automática de todas las rutas de la API (59 casos, incluidos permisos entre tiendas) | ✅ | `python probar_api.py` |
| Ejecutar el plan E2E desde el frontend: registro, cliente, compras, dashboard, análisis, eliminación | ⬜ | Usar la tienda demo |
| Pruebas de carga: 10 / 50 / 100 clientes por usuario, 2 sesiones simultáneas | ⬜ | |

## 5. Despliegue
| Tarea | Estado | Nota |
|---|---|---|
| `Dockerfile` con `requirements.txt` + `gunicorn`, sin Poetry | ✅ | `.dockerignore` excluye `.env`, datasets y notebooks |
| Dependencias separadas: API (`requirements.txt`) y notebooks (`requirements-notebooks.txt`) | ✅ | |
| Checklist de despliegue | ✅ | `deployment-checklist.md` |
| Versionado de la API (`/api/v1`) | ⬜ | Opcional para la tesis |
| CI/CD y release estable | ⬜ | |

## 6. Tesis y piloto con MiPyMEs de Santander de Quilichao
| Tarea | Estado | Nota |
|---|---|---|
| Autorización de datos (Ley 1581 de 2012 / Decreto 1377 de 2013) y acuerdo con cada MiPyME | ⬜ | Para entrenar solo se necesita cliente (seudónimo), fecha y monto |
| Definir indicadores de productividad y medir la línea base **antes** del CRM | ⬜ | Minutos por semana para decidir a quién contactar, tasa de recuperación de clientes en riesgo, abandono mensual, ingreso por cliente activo |
| Registrar 6 o más meses de compras reales en el CRM | ⬜ | |
| Recalibrar el modelo de abandono con datos locales y validar los segmentos con los dueños | ⬜ | |
| Medir los indicadores **después** del piloto (con un grupo de control si es posible) | ⬜ | Responde la pregunta de investigación |
| Capítulos de metodología (CRISP-DM) y resultados, incluida la lección del modelo v1 (fuga de datos) | ⬜ | Insumos: notebooks, model cards, `docs/arquitectura_crm.png` |
