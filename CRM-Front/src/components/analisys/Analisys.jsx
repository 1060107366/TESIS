/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { AlertTriangle, BarChart2, Users, TrendingUp } from "lucide-react";
import { useAnalysisStore } from "../../stores/AnalisysStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Analysis = () => {
  const { analysisData, isLoading, error, fetchAnalysisData, updatePredictions } =
    useAnalysisStore();

  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  const StatCard = ({ title, value, subtitle, icon: Icon }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Análisis</h1>
        <button
          onClick={() => updatePredictions().then(fetchAnalysisData)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          Ejecutar predicciones
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Predicción de Abandono"
          value={`${Object.values(analysisData?.metricas_principales?.churn_promedio || {})[0] ?? "N/A"}`}
          subtitle="Promedio de churn (>0.50)"
          icon={TrendingUp}
        />
        <StatCard
          title="Segmentación"
          value={`${analysisData?.segmentos?.length ?? 0} Segmentos`}
          subtitle="Identificados automáticamente"
          icon={Users}
        />
        <StatCard
          title="Rendimiento"
          value="Pendiente de evaluar"
          subtitle="Precisión del modelo"
          icon={BarChart2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Clientes por Segmento
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysisData?.segmentos || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Distribución por Segmento
          </h2>
          <div className="space-y-4">
            {Array.isArray(analysisData?.segmentos) && analysisData.segmentos.map((segmento, idx) => (
              <div key={segmento?.name ?? idx} className="flex items-center">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {segmento?.name ?? `Segmento ${idx + 1}`}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {segmento?.value ?? 0} clientes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (segmento?.value || 0) * 10)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
