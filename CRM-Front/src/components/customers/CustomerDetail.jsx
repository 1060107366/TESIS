/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {Edit2, User, Calendar, DollarSign, TrendingUp, AlertTriangle, MessageSquare, ChevronLeft, ArrowUpRight, History, Activity } from "lucide-react";
import { useCustomerStore } from "../../stores/CustomerStore.js";
import { formatCOP } from "../../utils/formatCurrency.js";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, error, fetchCustomerDetails, registerPurchase } =
    useCustomerStore();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [monto, setMonto] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");

  useEffect(() => {
    if (id) {
      fetchCustomerDetails(Number(id));
    }
  }, [id, fetchCustomerDetails]);

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend = null,
    color = "blue",
  }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-lg font-semibold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div
            className={`flex items-center text-${
              trend > 0 ? "green" : "red"
            }-600`}
          >
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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

  if (!selectedCustomer) return null;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/customers")}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {selectedCustomer.nombre}
            </h1>
            <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Registrar Compra
          </button>
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Editar Cliente
          </button>
        </div>
      </div>

      {/* Grid de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Compras"
          value={selectedCustomer.total_compras}
          icon={DollarSign}
          trend={5.2}
        />
        <MetricCard
          title="Frecuencia Compra"
          value={`${selectedCustomer.frecuencia_compra} días`}
          icon={Calendar}
        />
        <MetricCard
          title="Valor Promedio Orden"
          value={formatCOP(selectedCustomer.valor_medio_orden)}
          icon={TrendingUp}
          trend={-2.1}
        />
        <MetricCard
          title="Valor Cliente"
          value={formatCOP(selectedCustomer.valor_cliente)}
          icon={User}
          color="green"
        />
      </div>

      {/* Secciones de detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predicciones y Alertas */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Predicciones y Alertas
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Probabilidad de Churn
              </span>
              <div className="flex items-center">
                <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                  <div
                    className="h-2 bg-red-500 rounded-full"
                    style={{
                      width: `${selectedCustomer.probabilidad_churn * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {(selectedCustomer.probabilidad_churn * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de Interacciones */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Últimas Interacciones
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Contacto por email
                </p>
                <p className="text-sm text-gray-500">Hace 2 días</p>
              </div>
            </div>
            <div className="flex items-start">
              <Activity className="w-5 h-5 text-gray-400 mt-1" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Compra realizada
                </p>
                <p className="text-sm text-gray-500">Hace 5 días</p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Históricas */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Métricas Históricas
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <History className="w-5 h-5 text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Compras último mes
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {selectedCustomer?.total_compras ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Valor promedio 3 meses
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatCOP(selectedCustomer?.valor_medio_orden ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Registrar compra</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto</label>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de compra (opcional)</label>
                <input
                  type="datetime-local"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!monto || Number(monto) <= 0) {
                    alert("Ingresa un monto mayor a 0");
                    return;
                  }
                  try {
                    await registerPurchase(Number(id), {
                      monto: Number(monto),
                      fecha_compra: fechaCompra
                        ? fechaCompra.replace("T", " ") + ":00"
                        : undefined,
                    });
                    await fetchCustomerDetails(Number(id));
                    setShowPurchaseModal(false);
                    setMonto("");
                    setFechaCompra("");
                  } catch (e) {
                    alert("No se pudo registrar la compra");
                  }
                }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      {Array.isArray(selectedCustomer?.metricas_historicas) && selectedCustomer.metricas_historicas.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Métricas históricas</h2>
          <div className="space-y-3">
            {selectedCustomer.metricas_historicas.map((metric, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">
  {metric?.tipo_metrica === "frecuencia_compra"
    ? "Frecuencia"
    : metric?.tipo_metrica === "valor_medio_orden"
    ? "Ticket medio"
    : metric?.tipo_metrica === "valor_cliente"
    ? "CLV mensual"
    : metric?.tipo_metrica ?? "Métrica"}
</span>
                <span className="font-medium text-gray-900">
                  {metric?.valor ?? "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

};

export default CustomerDetail;
