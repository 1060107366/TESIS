import { fetchWithAuth } from "../auth/authService.js";

export const trendsApiService = {
  async getGlobalMonthlyActivity() {
    return await fetchWithAuth("/trends/global/actividad_mensual", { method: "GET" });
  },

  async getGlobalMonthlyRevenue() {
    return await fetchWithAuth("/trends/global/ingresos_mensuales", { method: "GET" });
  },

  async getGlobalLastMonthRevenue() {
    return await fetchWithAuth("/trends/global/ingresos_ultimo_mes", { method: "GET" });
  },

  async getGlobalPurchaseFrequency() {
    return await fetchWithAuth("/trends/global/frecuencia_compra", { method: "GET" });
  },

  async getGlobalAverageOrderValue() {
    return await fetchWithAuth("/trends/global/valor_medio_orden", { method: "GET" });
  },

  async getClientsBySegment() {
    return await fetchWithAuth("/trends/global/clientes_por_segmento", { method: "GET" });
  },

  async getCustomerPurchaseFrequency(id) {
    return await fetchWithAuth(`/trends/customer/${id}/frecuencia_compra`, { method: "GET" });
  },

  async getCustomerAverageOrderValue(id) {
    return await fetchWithAuth(`/trends/customer/${id}/valor_medio_orden`, { method: "GET" });
  },
};
