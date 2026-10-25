# Model card: segmentación de clientes (K-means RFM) v2.0.0

## Uso previsto
Clasificar a cada cliente con compras en el último año en **Bajo, Medio o Alto valor**, para que la MiPyME priorice esfuerzos (fidelización, reactivación, atención VIP) y para alimentar el catálogo de recomendaciones por segmento. No mide riesgo de abandono: eso lo hace el modelo de abandono v2.

## Datos
- **Online Retail II** (UCI, CC BY 4.0), solo Reino Unido: 5.350 clientes.
  - Entrenamiento: 4 cortes mensuales (dic-2010 a mar-2011), 15.631 filas.
  - Validación: jun-2011.
  - Test: sep-2011, 3.947 clientes.
- **CDNOW** (corte 1998-04-01, 9.526 clientes) como validación externa.
- **Variables** (calculadas con `churn_v2/features.py`, 365 días de historia):
  - Recencia y frecuencia, en log1p.
  - Gasto anual relativo al cliente mediano de la tienda, en log.
  - Las tres se estandarizan.

## Modelo
- **K-means con k = 4** (20 inicializaciones, semilla 42).
- **Por qué k = 4:** entre k = 3 y 6, es el de mayor silhouette en validación (0,378), con estabilidad temporal ARI = 0,84 y un grupo mínimo de 12 %.
- **Nombre de los clústeres:** se asignan por el puntaje de valor del centroide (−R + F + M), no por el número del clúster.

| Perfil | Recencia | Compras/año | Gasto vs cliente típico | % clientes (train) |
|---|---|---|---|---|
| Bajo valor | ~148 días | 1,2 | 0,36× | 39,8 % |
| Medio valor · reciente | ~14 días | 2,3 | 0,86× | 13,3 % |
| Medio valor · en pausa | ~84 días | 3,7 | 1,86× | 31,5 % |
| Alto valor | ~16 días | 11,5 | 6,6× | 15,4 % |

## Resultados (test sep-2011: qué hicieron los clientes en los 90 días siguientes)
| Método | eta² gasto futuro | Silhouette | Tamaño de segmentos | Monótono |
|---|---|---|---|---|
| **K-means v2** | **0,256** | **0,351** | 14 %–45 % | ✔ |
| Quintiles RFM (sin IA) | 0,245 | 0,293 | 29 %–40 % | ✔ |
| Regla anterior del CRM | 0,218 | 0,290 | 10 %–**75 %** | ✔ |

**K-means v2 por segmento:**

| Segmento | % clientes | Volvió a comprar | % del ingreso futuro |
|---|---|---|---|
| Bajo valor | 44,7 % | 27,7 % | 10,4 % |
| Medio valor | 41,0 % | 58,1 % | 30,4 % |
| Alto valor | 14,3 % | 90,8 % | 59,2 % |

- **Regla anterior:** dejaba al 75 % de los clientes en "Bajo valor", y ese grupo todavía generaba el 30 % del ingreso futuro.
- **Validación externa (CDNOW, sin reentrenar):** volvieron a comprar 15 % de Bajo, 34 % de Medio y 73 % de Alto valor. El orden se mantiene en otro negocio.

Cumple los 6 criterios de aceptación (ver `metricas.json`).

## Limitaciones
1. Se entrenó con un comercio del Reino Unido. Los perfiles son **relativos a cada tienda**, pero conviene revisar con los dueños de las MiPyMEs piloto si los grupos les resultan reconocibles (validación cualitativa).
2. Las mejoras sobre los quintiles RFM son moderadas (eta² +0,011). El valor principal está en los grupos más compactos y estables, y en la separación de un "Medio valor" que antes se confundía con "Bajo".
3. No usa interacciones no comerciales ni categorías de producto; se podrán agregar con datos locales.

## Entorno
Python 3.13, scikit-learn 1.6.1, pandas 2.2.3, numpy 2.2.6, semilla 42. Se reproduce ejecutando `DataPrepare.ipynb` y luego `TrainModel.ipynb`.
