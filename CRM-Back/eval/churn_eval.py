"""Evaluacion basica del modelo de churn."""
import json

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)

# TODO: cargar dataset real (X, y) y predicciones del modelo
# X = features, y_true = etiquetas, y_pred = modelo.predict(X), y_proba = modelo.predict_proba(X)[:, 1]

y_true = [0, 1, 0, 1]
y_pred = [0, 1, 0, 0]
y_proba = [0.1, 0.8, 0.2, 0.4]

metrics = {
    "accuracy": accuracy_score(y_true, y_pred),
    "precision": precision_score(y_true, y_pred, zero_division=0),
    "recall": recall_score(y_true, y_pred, zero_division=0),
    "f1": f1_score(y_true, y_pred, zero_division=0),
    "roc_auc": roc_auc_score(y_true, y_proba),
}

print(json.dumps(metrics, indent=2))
"""