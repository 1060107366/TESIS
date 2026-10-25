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
  monthlyRevenue: [],
  lastMonthRevenue: { total_ingresos: 0, mes: "", mes_corto: "" },
  segmentData: [],
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  updateMetrics: (metrics) => set({ metrics, isLoading: false }),
  updateActivity: (recentActivity) => set({ recentActivity }),
  updateTrends: (trends) => set({ trends }),
  updateMonthlyRevenue: (monthlyRevenue) => set({ monthlyRevenue }),
  updateLastMonthRevenue: (lastMonthRevenue) => set({ lastMonthRevenue }),
  updateSegments: (segmentData) => set({ segmentData }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      let recentActivity = [];
      let bySegment = [];
      let monthlyActivity = [];
      let monthlyRevenue = [];
      let lastMonthRevenue = { total_ingresos: 0, mes: "", mes_corto: "" };
      let churnAvg = null;
      let ownCustomers = [];
      try { recentActivity = await customerApiService.getRecentActivity(); } catch { recentActivity = []; }
      try { bySegment = await trendsApiService.getClientsBySegment(); } catch { bySegment = []; }
      if (!Array.isArray(bySegment) || bySegment.length === 0) {
        try {
          await predictionApiService.segmentClients();
          bySegment = await trendsApiService.getClientsBySegment();
        } catch {
          bySegment = [];
        }
      }
      try { monthlyActivity = await trendsApiService.getGlobalMonthlyActivity(); } catch { monthlyActivity = []; }
      try { monthlyRevenue = await trendsApiService.getGlobalMonthlyRevenue(); } catch { monthlyRevenue = []; }
      try { lastMonthRevenue = await trendsApiService.getGlobalLastMonthRevenue(); } catch { lastMonthRevenue = { total_ingresos: 0, mes: "", mes_corto: "" }; }
      try { churnAvg = await predictionApiService.getGlobalChurnAvg(); } catch { churnAvg = null; }
      try {
        const customers = await customerApiService.getCustomers();
        ownCustomers = Array.isArray(customers?.clientes) ? customers.clientes : Array.isArray(customers) ? customers : [];
      } catch { ownCustomers = []; }

      const segmentTotal = Array.isArray(bySegment)
        ? bySegment.reduce((acc, item) => acc + (Number(item?.value) || 0), 0)
        : 0;
      const segmentCount = Array.isArray(bySegment) ? bySegment.length : 0;
      const churnValue = churnAvg
        ? (Object.values(churnAvg)[0] ?? "Sin riesgo")
        : "Sin riesgo";

      set({
        metrics: {
          totalClients: ownCustomers.length,
          churnRate: String(churnValue),
          segments: segmentCount,
        },
        recentActivity: Array.isArray(recentActivity)
          ? recentActivity
          : (recentActivity?.actividad ?? []),
        trends: Array.isArray(monthlyActivity) ? monthlyActivity : [],
        monthlyRevenue: Array.isArray(monthlyRevenue) ? monthlyRevenue : [],
        lastMonthRevenue: lastMonthRevenue || { total_ingresos: 0, mes: "", mes_corto: "" },
        segmentData: Array.isArray(bySegment) ? bySegment : [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));