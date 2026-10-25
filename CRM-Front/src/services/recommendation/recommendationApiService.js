import { fetchWithAuth } from "../auth/authService.js";

export const recommendationApiService = {
  async getRecommendations(customerId) {
    return await fetchWithAuth(`/recomendaciones/${customerId}`, { method: "GET" });
  },

  async getCatalogo() {
    return await fetchWithAuth("/recomendaciones/catalogo", { method: "GET" });
  },

  async generateAllRecommendations() {
    return await fetchWithAuth("/recomendaciones/generar-todos", { method: "POST" });
  },

  async generateCustomerRecommendations(customerId) {
    return await fetchWithAuth(`/recomendaciones/generar/${customerId}`, { method: "POST" });
  },
};