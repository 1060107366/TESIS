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
      let recentActivity = [];
      try {
        recentActivity = await customerApiService.getRecentActivity();
      } catch {
        recentActivity = [];
      }
      const [churnAvg, bySegment] = await Promise.all([
        predictionApiService.getGlobalChurnAvg(),
        trendsApiService.getClientsBySegment(),
      ]);

      const segmentTotal = Array.isArray(bySegment)
        ? bySegment.reduce((acc, item) => acc + (Number(item?.value) || 0), 0)
        : 0;
      const segmentCount = Array.isArray(bySegment) ? bySegment.length : 0;
      const churnValue = churnAvg
        ? (Object.values(churnAvg)[0] ?? "Sin riesgo")
        : "Sin riesgo";

      set({
        metrics: {
          totalClients: segmentTotal,
          churnRate: String(churnValue),
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