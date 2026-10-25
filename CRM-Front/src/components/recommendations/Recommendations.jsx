import { useEffect, useState } from "react";
import { Plus, RefreshCw, Gift, Tag, Shield } from "lucide-react";
import { recommendationApiService } from "../../services/recommendation/recommendationApiService.js";
import { customerApiService } from "../../services/customer/customerApiService.js";

const Recommendations = () => {
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchCatalog = async () => {
    try {
      setIsLoading(true);
      const data = await recommendationApiService.getCatalogo();
      setCatalog(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Error al cargar el catálogo de recomendaciones");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      const result = await recommendationApiService.generateAllRecommendations();
      alert(`Recomendaciones generadas: ${result.exitosos} exitosos, ${result.errores} errores`);
      fetchCatalog();
    } catch (err) {
      alert("Error al generar recomendaciones");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const segmentLabels = {
    1: "Bajo Valor",
    2: "Medio Valor",
    3: "Alto Valor",
    4: "Nuevos",
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "$0";
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Gift className="w-6 h-6 mr-2 text-purple-600" />
          Catálogo de Recomendaciones
        </h1>
        <button
          onClick={handleGenerateAll}
          disabled={generating}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          Generar para Todos
        </button>
      </div>

      {/* Grid de tarjetas por segmento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(segmentLabels).map(([id, label]) => {
          const segmentCatalog = catalog.filter(c => c.segmento_id === Number(id));
          const colorMap = {
            1: "bg-red-50 border-red-200",
            2: "bg-amber-50 border-amber-200",
            3: "bg-green-50 border-green-200",
            4: "bg-indigo-50 border-indigo-200",
          };
          const iconColorMap = {
            1: "bg-red-100 text-red-600",
            2: "bg-amber-100 text-amber-600",
            3: "bg-green-100 text-green-600",
            4: "bg-indigo-100 text-indigo-600",
          };

          return (
            <div key={id} className={`border rounded-xl p-5 ${colorMap[id] || "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${iconColorMap[id] || "bg-gray-100 text-gray-600"}`}>
                  <Gift className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-500">{segmentCatalog.length} reglas</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{label}</h3>
              <div className="space-y-3">
                {segmentCatalog.length > 0 ? (
                  segmentCatalog.map((cat) => (
                    <div key={cat.id} className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cat.tipo_recomendacion}</p>
                          <p className="text-xs text-gray-500">
                            Descuento: {cat.reglas?.descuento || 0}%
                          </p>
                        </div>
                        <Tag className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded" />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <strong>Reglas:</strong> Frecuencia ≥ {cat.reglas?.min_frecuencia_compra || 0} | Churn ≤ {(cat.reglas?.max_probabilidad_churn || 1) * 100}%
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin reglas configuradas</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle del catálogo completo */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Detalle del Catálogo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Recomendación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reglas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {catalog.length > 0 ? (
                catalog.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cat.segmento_id === 1 ? "bg-red-100 text-red-800" :
                        cat.segmento_id === 2 ? "bg-amber-100 text-amber-800" :
                        cat.segmento_id === 3 ? "bg-green-100 text-green-800" :
                        "bg-indigo-100 text-indigo-800"
                      }`}>
                        {segmentLabels[cat.segmento_id] || `Segmento ${cat.segmento_id}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cat.tipo_recomendacion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(cat.reglas?.descuento || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Frec. ≥ {cat.reglas?.min_frecuencia_compra || 0} · Churn ≤ {(cat.reglas?.max_probabilidad_churn || 1) * 100}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No hay reglas en el catálogo</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;