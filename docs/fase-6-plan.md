# Fase 6 - CRMIA Web preciso (producto)

## Estructura propuesta

- `docs/product-requirements.md`: objetivos, roles, alcance.
- `docs/api-contract.md`: contrato API versionado (OpenAPI opcional).
- `docs/deployment-checklist.md`: pasos de despliegue.
- `CRM-Front/src/features/*`: organizar por dominio (clientes, analisis, auth).
- `CRM-Back/app/blueprints/versioned`: versionar API (`/api/v1`).
- `tests/`: e2e y contract tests.

## Objetivos

- Definir requerimientos funcionales/secundarios por rol.
- Estandarizar prefijos y contratos.
- CI/CD y release estable.
"""