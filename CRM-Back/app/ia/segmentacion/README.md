## **Modelo de Segmentación de Clientes (K-means RFM) v2**
Agrupa a los clientes según su **valor** (Recencia, Frecuencia y gasto Monetario relativo a su tienda). El modelo se prepara y entrena con **notebooks de Jupyter**, por bloques. Reemplaza a `app/ia/segments/`, cuyo K-means no lo usaba la app.

Segmentos del CRM: **1 Bajo valor · 2 Medio valor · 3 Alto valor · 4 Nuevos** (sin compras). El modelo distingue además **perfiles** dentro de un segmento; por ejemplo, "Medio valor · reciente" y "Medio valor · en pausa".

> **Valor ≠ riesgo.** La segmentación mide cuánto vale el cliente; el modelo de abandono (`../churn_v2`) mide si se va a ir. Un cliente de **alto valor con riesgo alto** es el primero al que el dueño debe llamar.

### Archivos
| Archivo | Para qué sirve |
|---|---|
| `DataPrepare.ipynb` | **Paso 1.** Carga y limpia los datos; analiza R, F y M; arma los cortes temporales con el resultado de negocio a 90 días; verifica que no haya fuga; prepara CDNOW; audita la segmentación anterior; exporta a `Data/` |
| `TrainModel.ipynb` | **Paso 2.** Elige k, entrena, nombra los clústeres por centroide, mide la utilidad de negocio frente a la regla anterior y a los quintiles RFM, valida en CDNOW, aplica criterios de aceptación y exporta el modelo |
| `servicio.py` | Lo que usa la API (no se ejecuta a mano) |
| `modelos/ACTUAL`, `modelos/v2.0.0/` | Modelo activo, `metricas.json`, `model_card.md` y gráfico |

Usa la misma función de variables que el modelo de abandono (`../churn_v2/features.py`) y los mismos datasets (`../datasets`).

### Pasos para la preparación de datos y entrenamiento
1. Abrir la carpeta `app/ia/segmentacion` en VS Code con el kernel del `.venv` del backend.
2. Ejecutar `DataPrepare.ipynb` (unos 10 s).
3. Revisar que la verificación de fuga muestre ✔ y que en `Data/` estén `seg_conjuntos.csv`, `cdnow_seg_test.csv` e `info_preparacion.json`.
4. En `TrainModel.ipynb`, cambiar `VERSION` si es un reentrenamiento.
5. Ejecutar `TrainModel.ipynb` (unos 10 s). Para la comparación con la regla anterior se necesita el modelo de abandono activo.
6. Si dice `MODELO ACEPTADO`, `modelos/ACTUAL` apunta a la nueva versión y la API la usa sin reiniciar.

### Criterios de aceptación
- Silhouette en validación ≥ 0,25 y estabilidad temporal (ARI) ≥ 0,75.
- Cada segmento con entre 5 % y 70 % de los clientes.
- El % que vuelve a comprar y el gasto de los 90 días siguientes crecen de Bajo → Medio → Alto, en test y en CDNOW.
- Explica el gasto futuro mejor que la regla anterior (eta²).

### Uso desde la API (ya integrado)
| Endpoint (JWT) | Qué hace |
|---|---|
| `POST /predictions/segment-clients` | Segmenta los clientes del usuario (antes segmentaba los de todos) |
| `GET /predictions/segmentos/cliente/<id>` | Segmento, perfil y valores RFM del cliente |
| `GET /predictions/segmentos/resumen` | Clientes y perfil promedio por segmento (para el dashboard) |
| `GET /predictions/segmentos/modelo` | Versión, k y perfiles del modelo |

Al crear un cliente o registrar una compra, su segmento se recalcula solo. Comando masivo: `flask update-segments`.

Reglas fuera del modelo:
- Clientes sin compras → **Nuevos** (requiere el segmento 4 de `seed.py`; si no existe, se usa Bajo valor).
- Clientes sin compras en más de 365 días → **Bajo valor**.
