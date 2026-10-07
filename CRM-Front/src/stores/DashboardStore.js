import { create } from "zustand";

// Datos de prueba
const mockData = {
  metrics: {
    totalClients: 150,
    churnRate: "15%",
    segments: 3,
  },
  recentActivity: [
    {
      client: "Cliente 1",
      action: "Actualización de datos",
      date: "2024-01-10",
      status: "Completado",
    },
    {
      client: "Cliente 2",
      action: "Nueva compra",
      date: "2024-01-09",
      status: "En proceso",
    },
    {
      client: "Cliente 3",
      action: "Contacto soporte",
      date: "2024-01-08",
      status: "Completado",
    },
  ],
  trends: [
    { month: "Ene", valor: 4000 },
    { month: "Feb", valor: 3000 },
    { month: "Mar", valor: 5000 },
    { month: "Abr", valor: 4500 },
    { month: "May", valor: 6000 },
    { month: "Jun", valor: 5500 },
  ],
};

export const useDashboardStore = create((set) => ({
  // Estado inicial
  metrics: {
    totalClients: 0,
    churnRate: "0%",
    segments: 0,
  },
  recentActivity: [],
  trends: [],
  isLoading: false,
  error: null,

  // Acciones
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  updateMetrics: (metrics) => set({ metrics, isLoading: false }),
  updateActivity: (recentActivity) => set({ recentActivity }),
  updateTrends: (trends) => set({ trends }),

  // Thunks
  fetchDashboardData: async () => {
    set({ isLoading: true });
    try {
      // Simulamos una llamada a la API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      set({
        metrics: mockData.metrics,
        recentActivity: mockData.recentActivity,
        trends: mockData.trends,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
