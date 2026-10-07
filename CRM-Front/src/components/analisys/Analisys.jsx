/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { AlertTriangle, BarChart2, Users, TrendingUp } from "lucide-react";
import { useAnalysisStore } from "../../stores/AnalisysStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Analysis = () => {
  const { analysisData, isLoading, error, fetchAnalysisData } =
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Predicción de Abandono"
          value={`${analysisData?.metricas_principales.clientes_riesgo} clientes`}
          subtitle="En riesgo alto de abandono"
          icon={TrendingUp}
        />
        <StatCard
          title="Segmentación"
          value={`${analysisData?.metricas_principales.total_segmentos} Segmentos`}
          subtitle="Identificados automáticamente"
          icon={Users}
        />
        <StatCard
          title="Rendimiento"
          value={`${analysisData?.metricas_principales.precision_modelo}%`}
          subtitle="Precisión del modelo"
          icon={BarChart2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Tendencias Temporales
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData?.tendencias || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#3B82F6"
                  name="Valor"
                />
                <Line
                  type="monotone"
                  dataKey="tasa_abandono"
                  stroke="#EF4444"
                  name="Tasa de Abandono"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Distribución por Segmento
          </h2>
          <div className="space-y-4">
            {analysisData?.segmentos.map((segmento) => (
              <div key={segmento.id} className="flex items-center">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {segmento.nombre}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {segmento.porcentaje}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${segmento.porcentaje}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {segmento.total_clientes} clientes
                    </span>
                    <span className="text-xs text-gray-500">
                      ${segmento.valor_promedio.toLocaleString()} valor promedio
                    </span>
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
