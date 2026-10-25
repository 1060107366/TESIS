# Model card: modelo de abandono de clientes (churn) v2.0.0

## Uso previsto
Estimar, para cada cliente con compras en el último año, la probabilidad de que **no vuelva a comprar en los próximos 90 días**. El dueño de la MiPyME usa esa probabilidad para priorizar a quién contactar.
- Es una herramienta de **priorización**. No toma decisiones automáticas sobre clientes.
- No aplica a clientes sin compras (arranque en frío).

## Etiqueta (sin fuga de datos)
```
|---- ventana de observación: 365 días ----| CORTE |---- ventana de predicción: 90 días ----|
   features (solo compras anteriores al corte)          churn = 1 si NO compra en esta ventana
```
La ventana de 90 días se justificó con los datos. En Online Retail II, el percentil 75 del tiempo entre compras es de 62 días y el percentil 90, de 137.

## Datos
| Uso | Dataset | Detalle |
|---|---|---|
| Entrenamiento / validación / test | UCI Online Retail II (CC BY 4.0) | 1.067.371 líneas, dic-2009 a dic-2011. Tras limpiar (sin cancelaciones, sin cliente nulo, solo Reino Unido): 725.250 líneas, 5.350 clientes y 33.541 facturas |
| Validación externa | CDNOW (Fader & Hardie, 2001) | 69.659 transacciones, 23.570 clientes, 1997-1998 |
| **Descartado** | Dataset original de la tesis (550 clientes) | Etiqueta derivada de la recencia (ver sección 8 de *DataPrepare.ipynb*) |

**Split temporal.** Los cortes son mensuales y las ventanas de etiquetas no se solapan:

| Conjunto | Cortes | Filas | % abandono |
|---|---|---|---|
| Entrenamiento | 4 (dic-2010 a mar-2011) | 15.631 | 66,1 % |
| Validación | 1 (jun-2011) | 3.969 | 63,9 % |
| Test | 1 (sep-2011) | 3.947 | 50,8 % |

## Variables (13)
- **Recencia:** `recencia_dias`, `ratio_recencia` (recencia dividida por el intervalo habitual del cliente).
- **Frecuencia:** `frecuencia`, `compras_por_mes`, `compras_30d`, `compras_90d`, `tendencia_90d`.
- **Regularidad:** `intercompra_media`, `intercompra_cv`, `compra_unica`.
- **Antigüedad:** `antiguedad_dias`.
- **Valor:** `log_ticket_relativo` y `log_monetario_relativo`, relativos a la mediana de la propia tienda. Por eso no dependen de la moneda.

Todas se calculan con `features.py`, la misma función que usan los notebooks y la API.

## Modelo
Se seleccionó la **regresión logística** (L2, C = 0,01, `class_weight="balanced"`, log1p + estandarización), con **calibración sigmoide** sobre el corte de validación. El criterio de selección fue el mayor PR-AUC en validación entre los candidatos.

## Resultados (corte de test sep-2011, IC 95 % por bootstrap)
| Modelo | ROC-AUC | PR-AUC | Brier |
|---|---|---|---|
| Referencia: predecir siempre la prevalencia | 0,500 | 0,508 | 0,250 |
| Baseline de una variable (recencia) | 0,707 | 0,682 | 0,241 |
| **Regresión logística (elegido)** | **0,768** [0,753–0,782] | **0,736** [0,715–0,758] | **0,214** [0,207–0,221] |
| Random Forest | 0,771 | 0,743 | 0,210 |
| HistGradientBoosting | 0,764 | 0,731 | 0,210 |

Los tres modelos completos son estadísticamente equivalentes. Se eligió la logística porque es interpretable y fue la mejor en validación.

**Con los umbrales de la app (test):**

| Umbral | Precisión | Recall | F1 | % de clientes marcados |
|---|---|---|---|---|
| 0,50 (riesgo medio) | 0,63 | 0,92 | 0,74 | 74 % |
| 0,65 (riesgo alto) | 0,67 | 0,81 | 0,73 | 62 % |

- **Lift del decil superior:** 1,60. El máximo posible con una prevalencia de 50,8 % es 1,97.
- **Variables más importantes (por permutación):** frecuencia, gasto relativo y recencia relativa.
- **Signos de los coeficientes:** más compras y más gasto bajan el riesgo; más tiempo sin comprar respecto al ritmo propio y más irregularidad lo suben.

**Sensibilidad a la ventana de predicción (test):**

| Ventana | % abandono | ROC-AUC | PR-AUC | Brier (vs. referencia) |
|---|---|---|---|---|
| 60 días | 57,3 % | 0,760 | 0,778 | 0,203 (0,245) |
| 90 días | 50,8 % | 0,768 | 0,736 | 0,214 (0,250) |
| 120 días | 48,1 % | 0,785 | 0,736 | 0,197 (0,250) |

**Validación externa en CDNOW** (otro negocio, otra moneda, otra época; sin reentrenar): ROC-AUC 0,739, PR-AUC 0,842 y Brier 0,175 frente a 0,209 de la referencia. El ordenamiento de clientes **se transfiere**.

## Limitaciones conocidas
1. **Calibración y estacionalidad.** El corte de test (sep–nov, temporada navideña) tiene menos abandono que los cortes de entrenamiento. En test, el modelo predice 64,5 % de media frente a 50,8 % real, es decir, sobreestima unos 14 puntos (ver *calibracion_test.png*). El orden de los clientes sí es fiable. Por eso en producción se recalibra con la ventana más reciente ya cumplida (`flask churn-recalibrate`).
2. **Datos extranjeros.** El modelo se entrenó con un mayorista del Reino Unido. Antes de reportar resultados de MiPyMEs de Santander de Quilichao hay que **recalibrar** con datos locales (al menos 50 casos por clase) y medir de nuevo.
3. **Recalibrar con un corte antiguo puede empeorar.** En CDNOW, recalibrar con ene-1998 y medir en abr-1998 subió el Brier de 0,175 a 0,181, porque la tasa de abandono cambió entre ambos cortes. Siempre se recalibra con la ventana cumplida **más reciente**, y se acepta la recalibración solo si mejora el Brier.
4. **Clientes de una sola compra.** Reciben un riesgo alto (alrededor de 0,8–0,9), coherente con los datos. En una tienda de barrio con clientes muy recurrentes, esto debe validarse en el piloto.
5. **Interacciones no comerciales** (llamadas, visitas). No se incluyen porque los datos públicos no las tienen. Se podrán agregar cuando el piloto aporte datos locales.

## Lección del modelo v1 (para el capítulo de resultados)
- El modelo v1 reportaba accuracy de 100 % (matriz [[18,0],[0,92]]).
- En el dataset original, la etiqueta `churn_status` coincide en un **99,8 %** con la regla "más de 90 días sin comprar".
- Usando solo la recencia se obtiene **AUC = 1,0**.
- El registro de actividad no corresponde con las compras declaradas: la correlación es de 0,11, y el 82 % de los clientes tiene "compras" posteriores a su `last_purchase_date`.

El modelo v1 no predecía: reproducía la regla con la que se construyó la etiqueta.

## Entorno
Python 3.13, scikit-learn 1.6.1, pandas 2.2.3, numpy 2.2.6, semilla 42. Todas las métricas están en *metricas.json*. Se reproduce ejecutando `DataPrepare.ipynb` y luego `TrainModel.ipynb`.
