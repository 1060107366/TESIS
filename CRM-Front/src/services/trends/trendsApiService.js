import { fetchWithAuth } from "../auth/authService.js";

export const trendsApiService = {
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