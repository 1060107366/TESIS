# Fase 7 - BD y contrato de datos

## Objetivo
Normalizar modelo de datos y contrato para un acople sólido.

## Tareas
- Revisar tipo de `metricas_historicas.valor` (DECIMAL 10,2 sugerido).
- Unificar nomenclatura `usuario` vs `users` en documentación/API.
- Definir campos obligatorios por cliente y usuario.
- Limpiar/retirar tablas backup en producción.
- Documentar migraciones y rollback.

## Salidas
- Migración Alembic para ajustes de tipos.
- Docs de contrato de datos.
"""