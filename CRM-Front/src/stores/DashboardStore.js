import { create } from "zustand";
import { customerApiService } from "../services/customer/customerApiService.js";
import { predictionApiService } from "../services/prediction/predictionApiService.js";
import { trendsApiService } from "../services/trends/trendsApiService.js";

export const useDashboardStore = create((set) => ({
  metrics: {
    totalClients: 0,
    churnRate: "0%",
    segments: 0,
  },
  recentActivity: [],
  trends: [],
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  updateMetrics: (metrics) => set({ metrics, isLoading: false }),
  updateActivity: (recentActivity) => set({ recentActivity }),
  updateTrends: (trends) => set({ trends }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [recentActivity, churnAvg, bySegment] = await Promise.all([
        customerApiService.getRecentActivity(),
        predictionApiService.getGlobalChurnAvg(),
        trendsApiService.getClientsBySegment(),
      ]);

      const segmentCount = Array.isArray(bySegment)
        ? bySegment.length
        : (bySegment?.segmentos?.length ?? 0);

      set({
        metrics: {
          totalClients: bySegment?.total_clientes ?? 0,
          churnRate: churnAvg ? JSON.stringify(churnAvg) : "0%",
          segments: segmentCount,
        },
        recentActivity: Array.isArray(recentActivity)
          ? recentActivity
          : (recentActivity?.actividad ?? []),
        trends: Array.isArray(bySegment) ? bySegment : [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));