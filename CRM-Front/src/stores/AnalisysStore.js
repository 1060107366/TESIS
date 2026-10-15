import { create } from "zustand";
import { predictionApiService } from "../services/prediction/predictionApiService.js";
import { trendsApiService } from "../services/trends/trendsApiService.js";

export const useAnalysisStore = create((set) => ({
  analysisData: null,
  selectedSegment: null,
  isLoading: false,
  error: null,

  setAnalysisData: (data) => set({ analysisData: data }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchAnalysisData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [churnAvg, clientsBySegment, purchaseFreq] = await Promise.all([
        predictionApiService.getGlobalChurnAvg(),
        trendsApiService.getClientsBySegment(),
        trendsApiService.getGlobalPurchaseFrequency(),
      ]);

      set({
        analysisData: {
          metricas_principales: {
            churn_promedio: churnAvg,
            compra_frecuencia: purchaseFreq,
          },
          segmentos: Array.isArray(clientsBySegment)
            ? clientsBySegment
            : (clientsBySegment?.segmentos ?? []),
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updatePredictions: async () => {
    set({ isLoading: true });
    try {
      await predictionApiService.segmentClients();
      set({ isLoading: false, error: null });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  resetAnalysisState: () => {
    set({ analysisData: null, selectedSegment: null, isLoading: false, error: null });
  },
}));