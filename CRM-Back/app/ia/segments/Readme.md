
## **Informacion importante**
"""
En la carpeta 'segments' hay dos modelos de preparación de datos. Uno de ellos utiliza el dataset que se usó para entrenar el modelo de predicción, mientras que el otro emplea datos de producción obtenidos de la base de datos del proyecto.

Aunque lo más recomendado es usar los datos de producción, este modelo no contiene suficientes datos para entrenar el modelo de manera efectiva, lo que causa que la asignación de segmentos en el clustering de k-means sea deficiente. pero se mantiene en el proyecto ya que su implementacion a futuro con una base de datos de produccion mas robusta puede mejorar ampliamente.

Por otro lado, el modelo entrenado con los datos del dataset refleja una mejor precisión en la asignación de estos segmentos/clusters a los clientes, aunque aún presenta un amplio margen de mejora.
"""

> El archivo 'DataPrepare_m1.ipynb' es el modelo de preparacion de datos usando el DataSet
> El archivo 'DataPrepare_m2.ipynb' es el modelo de preparacion con datos de produccion del proyecto uasndo la DB
> El archivo 'segment.ipynb' es el modelo de entrenamiento usa K-means Cloustering

- ### Pasos para la preparacion de datos y entrenamiento
1. Ejecutar 'DataPrepare_m1.ipynb'
2. Revisar que los datos preparados sean exportados a 'app\ia\segments\Data'
3. Ejecutar 'segment.ipynb'
4. Revisar que el modelo y el scaler sean exportados a 'app\ia\segments\Data'