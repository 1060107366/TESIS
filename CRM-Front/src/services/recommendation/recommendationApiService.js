import { fetchWithAuth } from "../auth/authService.js";

export const recommendationApiService = {
  async getRecommendations(customerId) {
    return await fetchWithAuth(`/recomendaciones/${customerId}`, { method: "GET" });
  },
};