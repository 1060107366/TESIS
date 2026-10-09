/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {Edit2, User, Calendar, DollarSign, TrendingUp, AlertTriangle, MessageSquare, ChevronLeft, ArrowUpRight, History, Activity } from "lucide-react";
import { useCustomerStore } from "../../stores/CustomerStore.js";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, error, fetchCustomerDetails } =
    useCustomerStore();

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
          value={`$${selectedCustomer.total_compras.toFixed(2)}`}
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
          value={`$${selectedCustomer.valor_medio_orden.toFixed(2)}`}
          icon={TrendingUp}
          trend={-2.1}
        />
        <MetricCard
          title="Valor Cliente"
          value={`$${selectedCustomer.valor_cliente.toFixed(2)}`}
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
                5 compras
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Valor promedio 3 meses
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">$345.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
