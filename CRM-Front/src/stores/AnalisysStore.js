import { create } from "zustand";

// Datos de prueba para el desarrollo del componente de analisis
const mockAnalysisData = {
  metricas_principales: {
    clientes_riesgo: 23,
    total_segmentos: 3,
    precision_modelo: 85,
  },
  tendencias: [
    { mes: "Ene", valor: 65, tasa_abandono: 0.15 },
    { mes: "Feb", valor: 75, tasa_abandono: 0.12 },
    { mes: "Mar", valor: 70, tasa_abandono: 0.18 },
    { mes: "Abr", valor: 85, tasa_abandono: 0.14 },
    { mes: "May", valor: 80, tasa_abandono: 0.11 },
    { mes: "Jun", valor: 90, tasa_abandono: 0.09 },
  ],
  segmentos: [
    {
      id: 1,
      nombre: "Alto Valor",
      porcentaje: 35,
      total_clientes: 40,
      valor_promedio: 2500.0,
    },
    {
      id: 2,
      nombre: "Valor Medio",
      porcentaje: 45,
      total_clientes: 75,
      valor_promedio: 1200.0,
    },
    {
      id: 3,
      nombre: "Bajo Valor",
      porcentaje: 20,
      total_clientes: 35,
      valor_promedio: 500.0,
    },
  ],
  predicciones_abandono: [
    {
      id: 1,
      cliente_id: 1,
      probabilidad: 0.85,
      factores_riesgo: ["Baja frecuencia", "Disminución en compras"],
      fecha_prediccion: "2024-01-15T00:00:00",
    },
    {
      id: 2,
      cliente_id: 2,
      probabilidad: 0.65,
      factores_riesgo: ["Quejas recientes"],
      fecha_prediccion: "2024-01-15T00:00:00",
    },
  ],
};

export const useAnalysisStore = create((set) => ({
  // Estado inicial
  analysisData: null,
  selectedSegment: null,
  isLoading: false,
  error: null,

  // Acciones básicas para actualizar el estado
  setAnalysisData: (data) => set({ analysisData: data }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones principales para interactuar con la API
  fetchAnalysisData: async () => {
    set({ isLoading: true });
    try {
      // Simular llamada a API  para obtener datos de análisis
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set({
        analysisData: mockAnalysisData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  updatePredictions: async () => {
    set({ isLoading: true });
    try {
      // Simular llamada a API para actualizar predicciones
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set((state) => ({
        analysisData: {
          ...state.analysisData,
          predicciones_abandono: state.analysisData.predicciones_abandono.map(
            (pred) => ({
              ...pred,
              fecha_prediccion: new Date().toISOString(),
            })
          ),
        },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  fetchSegmentDetails: async (segmentId) => {
    set({ isLoading: true });
    try {
      // Simular llamada a API para obtener detalles del segmento
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const segment = mockAnalysisData.segmentos.find(
        (s) => s.id === segmentId
      );
      if (!segment) throw new Error("Segmento no encontrado");

      set({
        selectedSegment: segment,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  updateSegmentation: async () => {
    set({ isLoading: true });
    try {
      // Simular llamada a API para actualizar segmentación
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set((state) => ({
        analysisData: {
          ...state.analysisData,
          fecha_actualizacion: new Date().toISOString(),
        },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  // Resetear estado de análisis
  resetAnalysisState: () => {
    set({
      analysisData: null,
      selectedSegment: null,
      isLoading: false,
      error: null,
    });
  },
}));
