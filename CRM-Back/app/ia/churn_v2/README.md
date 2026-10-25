## **Modelo de Predicción de Abandono (CHURN) v2**
El modelo se prepara y entrena con **notebooks de Jupyter** en VS Code, por bloques, para facilitar la documentación y la comprensión del modelo de IA. Reemplaza al modelo v1 (`app/ia/churn_model/`), que tenía fuga de datos: su 100 % de precisión venía de que la etiqueta se construía con la misma variable que usaba para predecir.

### Archivos
| Archivo | Para qué sirve |
|---|---|
| `DataPrepare.ipynb` | **Paso 1.** Carga, limpia y analiza los datos; construye la etiqueta con fecha de corte; verifica que no haya fuga; audita el dataset del v1; exporta a `Data/` |
| `TrainModel.ipynb` | **Paso 2.** Entrena y compara 4 modelos, calibra probabilidades, evalúa (test, CDNOW, sensibilidad), aplica criterios de aceptación y exporta el modelo a `modelos/` |
| `features.py` | Fórmula de las 13 variables. La usan **los notebooks y la API**: así el modelo recibe en producción exactamente lo que vio al entrenar. **No duplicar estas fórmulas** |
| `servicio.py` | Lo que usa la API Flask para predecir, monitorear y recalibrar (no se ejecuta a mano) |
| `Data/` | Datos preparados (se regeneran con `DataPrepare.ipynb`) |
| `modelos/ACTUAL` | Versión activa del modelo (p. ej. `v2.0.0`) |
| `modelos/v2.0.0/` | `modelo.pkl`, `metricas.json`, `model_card.md` (ficha del modelo) y gráficos |

Datasets en `app/ia/datasets/`:
- `online_retail_ii.csv.gz`: UCI Online Retail II, CC BY 4.0, entrenamiento.
- `CDNOW_master.txt`: Fader & Hardie, validación externa.
- Dataset original del v1: solo para la auditoría.

### Pasos para la preparación de datos y entrenamiento
1. Abrir la carpeta `app/ia/churn_v2` en VS Code y seleccionar el kernel del entorno virtual del backend (`.venv`).
2. Ejecutar `DataPrepare.ipynb` completo (unos 15 s).
3. Revisar que la celda de **verificación de fuga** muestre ✔ y que en `Data/` se exportaron `churn_conjuntos_v90.csv`, `cdnow_*.csv` e `info_preparacion.json`.
4. En `TrainModel.ipynb`, cambiar `VERSION` (p. ej. `"2.1.0"`) si es un reentrenamiento.
5. Ejecutar `TrainModel.ipynb` completo (unos 3 minutos).
6. Revisar la celda **Criterios de aceptación**. Si dice `MODELO ACEPTADO`, se guarda en `modelos/v<VERSION>/` y `modelos/ACTUAL` apunta a esa versión. La API la usa desde la siguiente predicción, sin reiniciar.
7. Copiar los resultados nuevos en la ficha `modelos/v<VERSION>/model_card.md` (puede partir de la de v2.0.0).

> **Precisión esperada.** En abandono de clientes de comercio no contractual, un ROC-AUC entre 0,70 y 0,85 es un buen resultado. **No buscar 100 %**: un ROC-AUC mayor a 0,97 indica fuga de datos y el notebook rechaza el modelo.

### Criterios de aceptación (celda 9 de TrainModel)
- ROC-AUC de test ≥ 0,70 y ≤ 0,97.
- PR-AUC de test mayor que el % de abandono.
- Brier de test menor que el Brier de referencia (predecir siempre el promedio).
- Mejor que el baseline de una sola variable (días sin comprar).

Para reemplazar una versión anterior, el PR-AUC debe ser ≥ al anterior − 0,01 en el mismo corte de test.

### Uso desde la API (ya integrado)
| Endpoint (JWT) | Qué hace |
|---|---|
| `GET/POST /predictions/predict-churn` | Recalcula el riesgo de los clientes del usuario y guarda el historial |
| `GET /predictions/churn/<id>` | Probabilidad, nivel (bajo / medio / alto) y razones legibles |
| `GET /predictions/churn/modelo` | Versión y métricas del modelo activo |
| `GET /predictions/churn/monitoreo` | Deriva de datos (PSI) frente al entrenamiento |

Al registrar una compra o crear un cliente con compra inicial, el riesgo se recalcula solo.

**Comandos:**
```powershell
flask churn-predict                       # recálculo masivo (mensual)
flask churn-monitor                       # deriva de datos (PSI > 0,25 → recalibrar / reentrenar)
flask churn-recalibrate --corte 2026-06-01   # ajusta las probabilidades con datos locales
```

### Piloto con MiPyMEs de Santander de Quilichao
El modelo se entrenó con un comercio del Reino Unido. El **orden** de riesgo de los clientes se transfirió bien a otro negocio (CDNOW, ROC-AUC 0,74), pero la **escala de probabilidad** debe ajustarse localmente.

1. **Autorización de datos (Ley 1581 de 2012 / Decreto 1377 de 2013).** Para el modelo solo se necesita cliente (seudónimo), fecha y monto de cada compra.
2. **Registro de compras con fecha real** en el CRM, durante al menos 6 meses.
3. **Recalibración** con `flask churn-recalibrate --corte AAAA-MM-DD`, usando el corte más reciente cuya ventana de 90 días ya terminó. Se necesitan al menos 50 abandonos y 50 retenidos. Activar la versión `-local-` en `modelos/ACTUAL` solo si mejora el Brier.
4. **Reentrenamiento con datos locales** con al menos 12 meses de historia y al menos 300 clientes: en `DataPrepare.ipynb`, reemplazar la carga de Online Retail II por una exportación de las compras del CRM, con las mismas columnas `cliente_id, factura_id, fecha, monto, tienda_id`.
