import { fetchWithAuth } from "../auth/authService.js";

export const predictionApiService = {
  async predictChurnAll() {
    return await fetchWithAuth("/predictions/predict-churn", { method: "GET" });
  },
  async getGlobalChurnAvg() {
    return await fetchWithAuth("/predictions/global/churn_avg", { method: "GET" });
  },
  async segmentClients() {
    return await fetchWithAuth("/predictions/segment-clients", { method: "POST" });
  },
};