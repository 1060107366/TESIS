"""Evaluacion basica del modelo de segmentacion."""
from sklearn.metrics import silhouette_score
import json

# TODO: cargar features X y labels de segmento asignados
X = [[1.0, 2.0], [1.1, 2.1], [5.0, 6.0], [5.1, 6.1]]
labels = [0, 0, 1, 1]

score = silhouette_score(X, labels)
print(json.dumps({"silhouette_score": score}, indent=2))
"""