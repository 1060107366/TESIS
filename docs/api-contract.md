# Contrato de la API (estado al 24/10/2026)

- **Base:** `http://localhost:5001` (variable `VITE_API_URL` en el frontend). Prefijos: `/auth`, `/customer`, `/predictions`, `/recomendaciones`, `/trends`.
- **Autenticación:** todas las rutas, salvo registro y login, requieren el encabezado `Authorization: Bearer <token>`.
- **Alcance:** cada usuario (tienda) solo ve y modifica sus propios clientes.

## Convenciones
- **Errores:** JSON con `error` y `message` (el mismo texto; el frontend muestra `message`), también en token vencido o ausente (401) y en rutas inexistentes (404).
- **Clientes de otra tienda:** responden **404 "Cliente no encontrado"** (no se revela que existen).
- **Listas sin datos:** responden `200` con `[]` (interacciones, métricas, actividad reciente, recomendaciones).
- **Compras:** `monto` > 0. `fecha_compra` es opcional y acepta `AAAA-MM-DD HH:MM:SS`, `AAAA-MM-DDTHH:MM` o `AAAA-MM-DD`; no puede ser futura. Una compra con fecha antigua no cambia `ultima_compra`.
- **Correos:** se guardan en minúsculas; el correo de un cliente es único dentro de cada tienda.
- **Riesgo de abandono:** `probabilidad_churn` es `null` mientras el cliente no tenga compras.
- **Nombres de segmento:** salen de la tabla `segmentos` (Bajo valor, Medio valor, Alto valor, Nuevos; `python seed.py`).

## Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea usuario (`usuario`, `email`, `contrasena`) y devuelve el token |
| POST | `/auth/login` | `email`, `contrasena` → `access_token` |
| PUT | `/auth/update` | Actualiza el perfil |
| GET | `/auth/me` | Datos del usuario autenticado |

## Clientes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/customer/` | Clientes del usuario |
| POST | `/customer/create` | `nombre`, `email`, `telefono`, opcional `valor_orden_total` (compra inicial). Recalcula métricas, riesgo y segmento |
| PUT | `/customer/update/:id` | `action=update_basic` (datos básicos) o `action=new_interaction` con `data_interaccion.monto` y opcional `fecha_compra` (`AAAA-MM-DD HH:MM:SS`) para registrar una compra. Recalcula métricas, riesgo, segmento y recomendaciones |
| DELETE | `/customer/delete/:id` | Elimina el cliente y sus datos asociados |
| GET | `/customer/:id` | Detalle |
| GET | `/customer/:id/interacciones` | Interacciones |
| GET | `/customer/metrics/:id` | Métricas históricas |
| GET | `/customer/actividad-reciente` | Actividad reciente del usuario |

## Predicciones: abandono (modelo `app/ia/churn_v2`)
| Método | Ruta | Descripción |
|---|---|---|
| POST (o GET) | `/predictions/predict-churn` | Recalcula `probabilidad_churn` de los clientes del usuario y guarda el historial |
| GET | `/predictions/churn/:id` | `probabilidad`, `nivel` (bajo / medio / alto), `estado` (modelo / inactivo / sin_historial) y `razones` legibles |
| GET | `/predictions/churn/modelo` | Versión, algoritmo y métricas de test del modelo activo |
| GET | `/predictions/churn/monitoreo` | PSI por variable y de las probabilidades (estable / vigilar / reentrenar) |
| GET | `/predictions/global/churn_avg` | Promedio de probabilidad de los clientes con riesgo > 0,50 |

## Predicciones: segmentación (modelo `app/ia/segmentacion`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/predictions/segment-clients` | Segmenta los clientes del usuario (1 Bajo, 2 Medio, 3 Alto valor, 4 Nuevos) |
| GET | `/predictions/segmentos/cliente/:id` | Segmento, perfil, descripción y valores RFM del cliente |
| GET | `/predictions/segmentos/resumen` | Clientes y perfil promedio por segmento |
| GET | `/predictions/segmentos/modelo` | Versión, k y perfiles (centroides) del modelo activo |

## Tendencias
| Método | Ruta |
|---|---|
| GET | `/trends/global/ingresos_mensuales` (12 meses, meses sin ventas = 0) |
| GET | `/trends/global/ingresos_ultimo_mes` |
| GET | `/trends/global/frecuencia_compra` |
| GET | `/trends/global/valor_medio_orden` |
| GET | `/trends/global/actividad_mensual` (6 meses) |
| GET | `/trends/global/clientes_por_segmento` (`segmento_id`, `name`, `value`) |
| GET | `/trends/customer/:id/frecuencia_compra` |
| GET | `/trends/customer/:id/valor_medio_orden` |

## Recomendaciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/recomendaciones/catalogo` | Catálogo por segmento |
| POST | `/recomendaciones/generar-todos` | Genera recomendaciones para todos los clientes del usuario |
| POST | `/recomendaciones/generar/:id` | Genera recomendaciones para un cliente |
| GET | `/recomendaciones/:id` | Recomendaciones de un cliente |

## Comandos de servidor (Flask CLI)
`flask update-all-metrics` · `flask churn-predict` · `flask update-segments` · `flask churn-monitor` · `flask churn-recalibrate --corte AAAA-MM-DD`

## Prueba automática
Con el backend corriendo: `python probar_api.py` (en `CRM-Back`) ejecuta 59 pruebas sobre todas las rutas usando la tienda demo.
