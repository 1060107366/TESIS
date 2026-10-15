# Plan de pruebas con usuarios y clientes

## Usuarios de prueba
- Usuario A (propietario).
- Usuario B (operador).
- Usuario C (sesión paralela).

## Escenarios funcionales
1. Registro e inicio de sesión.
2. Crear cliente con datos válidos/inválidos.
3. Registrar una o varias compras por cliente.
4. Ver detalle de cliente (interacciones, métricas).
5. Dashboard con actividad reciente, métricas y gráficos.
6. Analysis: ejecutar predicciones y segmentación.
7. Eliminar cliente y validar limpieza.

## Pruebas de concurrencia/carga
- 10, 50 y 100 clientes por usuario.
- Sesiones simultáneas (2 usuarios).
- Login repetido, expiración de token.
- Registro de compras concurrentes.

## Criterios de éxito
- Sin errores CORS.
- Sin 4xx/5xx en flujo principal.
- Métricas y segmentos actualizados.
- Tiempo de respuesta aceptable.
"""