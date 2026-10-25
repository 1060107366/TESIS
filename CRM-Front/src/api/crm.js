// Todas las rutas del backend en un solo lugar (ver docs/api-contract.md).
import { get, post, put, del } from "../lib/http.js";

export const cuenta = {
  ingresar: (email, contrasena) => post("/auth/login", { email, contrasena }),
  crear: (usuario, email, contrasena) => post("/auth/register", { usuario, email, contrasena }),
  yo: () => get("/auth/me"),
  actualizar: (cambios) => put("/auth/update", cambios),
};

export const clientes = {
  listar: () => get("/customer/").then((r) => r?.clientes ?? []),
  obtener: (id) => get(`/customer/${id}`),
  crear: (datos) => post("/customer/create", datos),
  actualizar: (id, datos) => put(`/customer/update/${id}`, { action: "update_basic", ...datos }),
  registrarCompra: (id, monto, fechaCompra) =>
    put(`/customer/update/${id}`, {
      action: "new_interaction",
      data_interaccion: { monto, ...(fechaCompra ? { fecha_compra: fechaCompra } : {}) },
    }),
  eliminar: (id) => del(`/customer/delete/${id}`),
  interacciones: (id) => get(`/customer/${id}/interacciones`),
  metricas: (id) => get(`/customer/metrics/${id}`),
  actividadReciente: () => get("/customer/actividad-reciente"),
};

// Modelos de IA
export const riesgo = {
  actualizarTodo: () => post("/predictions/predict-churn"),
  deCliente: (id) => get(`/predictions/churn/${id}`),
  modelo: () => get("/predictions/churn/modelo"),
  monitoreo: () => get("/predictions/churn/monitoreo"),
  promedio: () => get("/predictions/global/churn_avg"),
};

export const segmentos = {
  actualizarTodo: () => post("/predictions/segment-clients"),
  deCliente: (id) => get(`/predictions/segmentos/cliente/${id}`),
  resumen: () => get("/predictions/segmentos/resumen"),
  modelo: () => get("/predictions/segmentos/modelo"),
};

export const tendencias = {
  ventasPorMes: () => get("/trends/global/ingresos_mensuales"),
  ventasMesAnterior: () => get("/trends/global/ingresos_ultimo_mes"),
  actividadPorMes: () => get("/trends/global/actividad_mensual"),
  frecuenciaClientes: () => get("/trends/global/frecuencia_compra"),
  ticketClientes: () => get("/trends/global/valor_medio_orden"),
  clientesPorSegmento: () => get("/trends/global/clientes_por_segmento"),
  frecuenciaCliente: (id) => get(`/trends/customer/${id}/frecuencia_compra`),
  ticketCliente: (id) => get(`/trends/customer/${id}/valor_medio_orden`),
};

export const ofertas = {
  catalogo: () => get("/recomendaciones/catalogo"),
  prepararTodas: () => post("/recomendaciones/generar-todos"),
  prepararCliente: (id) => post(`/recomendaciones/generar/${id}`),
  deCliente: (id) => get(`/recomendaciones/${id}`),
};
