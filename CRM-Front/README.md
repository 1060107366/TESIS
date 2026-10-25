# CRM-Front · Mi tienda

Interfaz web del CRM para tenderos y MiPyMEs. Habla el idioma del dueño de la tienda
(“¿Volverá a comprar?”, “Llame hoy a estos clientes”) y muestra los resultados de los
dos modelos de IA del backend: riesgo de abandono (churn v2) y tipos de cliente (K-means RFM v2).

## Tecnologías

| Herramienta | Uso |
|---|---|
| React 18 + Vite 6 | Aplicación y servidor de desarrollo |
| Tailwind CSS 4 (`@tailwindcss/vite`) | Estilos; todo el diseño vive en `src/styles/index.css` |
| React Router 7 | Rutas y páginas con carga diferida |
| Zustand 5 | Sesión y avisos |
| Recharts 2 | Gráfico de barras por mes |
| lucide-react | Íconos |
| Lexend (fontsource) | Tipografía pensada para lectura fácil |
| Vitest + Testing Library | Pruebas |

## Cómo arrancar

```bash
cp .env.example .env          # VITE_API_URL=http://localhost:5001
npm install                   # o: bun install
npm run dev                   # http://localhost:5173
npm test                      # pruebas
npm run build                 # versión de producción en dist/
```

El backend (CRM-Back) debe estar corriendo en la URL de `VITE_API_URL`.
Usuario de demostración: `demo@tienda-demo.co` / `Demo2026*` (creado con `cargar_demo.py`).

## Sistema de diseño: Glassmorphism + Bento Grid

Todo cambio visual se hace en **un solo archivo**: `src/styles/index.css`.

- `@theme { … }` define los *tokens*: tipografía, tamaños de letra, colores
  (`primary`, `ink`, colores de riesgo `risk-*`, colores de tipo de cliente `seg-*`),
  vidrio (`glass`, `glass-strong`, `glass-edge`, `--blur-glass`), radios y sombras.
  Cambiar un color ahí lo cambia en toda la aplicación (incluidos los gráficos SVG,
  que leen los tokens con `src/lib/tokens.js`).
- `@utility glass` / `glass-strong`: las superficies de vidrio.
- `@utility bento` / `bento-2`: la cuadrícula de mosaicos (1 columna en celular,
  2 en tableta, 4 en escritorio, con relleno denso).
- `body::before`: el fondo de manchas de color difuminadas detrás del vidrio.

Las piezas reutilizables están en `src/components/ui/`:

- `Mosaico.jsx`: `Bento` (la cuadrícula), `Mosaico` (cada tarjeta), `Cifra` (número grande), `Encabezado`.
- `Controles.jsx`: `Boton`, `BotonEnlace`, `Campo`, `Filtro`.
- `Etiquetas.jsx`: `EtiquetaSegmento`, `EtiquetaRiesgo`, `MedidorRiesgo`.
- `Estados.jsx`: `Cargando`, `ErrorCaja`, `Vacio`, `Ventana`, `Avisos`.

Los textos que explican cada tipo de cliente y cada nivel de riesgo están en
`src/lib/significados.js` (umbrales 0,50 y 0,65, los mismos del modelo).

## Estructura

```
src/
  api/crm.js           todas las rutas del backend en un solo lugar
  lib/                 http (token, errores, sesión vencida), formato (pesos, fechas), significados
  stores/sesion.js     sesión del usuario y avisos
  components/          layout/Marco.jsx (menú), gráficos, formularios, contacto
  pages/               una página por ruta
  styles/index.css     sistema de diseño
  test/                pruebas
```

## Páginas y rutas del backend que usan

| Página | Ruta | Backend |
|---|---|---|
| Ingresar / Crear cuenta | `/ingresar`, `/crear-cuenta` | `POST /auth/login`, `POST /auth/register` |
| Inicio | `/inicio` | `/customer/`, `/customer/actividad-reciente`, `/trends/global/ingresos_mensuales`, `/trends/global/ingresos_ultimo_mes`, `/trends/global/clientes_por_segmento`, `/predictions/churn/<id>` |
| Clientes | `/clientes` | `/customer/`, `/customer/create` (búsqueda, orden y filtros por tipo y riesgo) |
| Ficha del cliente | `/clientes/:id` | `/customer/<id>`, `/customer/<id>/interacciones`, `/customer/metrics/<id>`, `/customer/update/<id>`, `/customer/delete/<id>`, `/predictions/churn/<id>`, `/predictions/segmentos/cliente/<id>`, `/recomendaciones/<id>`, `/recomendaciones/generar/<id>`, `/trends/customer/<id>/…` |
| Registrar venta | `/vender` | `/customer/update/<id>` con la compra (recalcula la IA del cliente) |
| Cómo va mi tienda | `/mi-tienda` | `/predictions/segmentos/resumen`, `/predictions/segmentos/modelo`, `/predictions/churn/modelo`, `/predictions/churn/monitoreo`, `/predictions/global/churn_avg`, `/trends/global/actividad_mensual`, `/trends/global/valor_medio_orden`, `/trends/global/frecuencia_compra`; botón “Actualizar análisis” (`/predictions/predict-churn`, `/predictions/segment-clients`) |
| Ofertas | `/ofertas` | `/recomendaciones/catalogo`, `/recomendaciones/generar-todos` |
| Mi cuenta | `/mi-cuenta` | `/auth/me`, `/auth/update` |

El detalle de cada ruta está en `docs/api-contract.md`.
