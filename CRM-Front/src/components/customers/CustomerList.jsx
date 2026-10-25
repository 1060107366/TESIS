import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useCustomerStore } from "../../stores/CustomerStore.js";

const CustomerList = () => {
  const navigate = useNavigate();
  const {
    customers,
    isLoading,
    error,
    fetchCustomers,
    deleteCustomer,
    clearError,
  } = useCustomerStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // Cargar clientes al montar el componente
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        await fetchCustomers();
      } catch (error) {
        console.error("Error al cargar los clientes:", error);
      }
    };
    loadCustomers();
    return () => clearError(); // Limpiar errores al desmontar
  }, [fetchCustomers, clearError]);

  // Filtrar clientes cuando cambia la búsqueda o la lista
  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        (selectedSegment === null ||
          (customer.segmento_id ?? 0) === selectedSegment) &&
        (customer.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCustomers(filtered);
  }, [customers, searchTerm, selectedSegment]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (id, customerName) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas eliminar al cliente ${customerName}?`
      )
    ) {
      try {
        await deleteCustomer(id);
      } catch (error) {
        console.error("Error al eliminar el cliente:", error);
      }
    }
  };

  // Componente para mostrar cuando no hay resultados
  const NoResults = () => (
    <tr>
      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Info className="w-6 h-6" />
          <p>
            No se encontraron clientes
            {searchTerm && ` que coincidan con "${searchTerm}"`}
          </p>
        </div>
      </td>
    </tr>
  );

  // Formatear fecha considerando valores nulos
  const formatDate = (dateString) => {
    if (!dateString) return "No registrada";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Fecha inválida";
    }
  };

  // Formatear número considerando valores nulos
  const formatNumber = (number, decimals = 2) => {
    if (number === null || number === undefined) return "N/A";
    return `$${Number(number).toFixed(decimals)}`;
  };

  // Formatear total de compras como entero en moneda
  const formatTotalCompras = (number) => {
    if (number === null || number === undefined) return "N/A";
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(Number(number)));
  };

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
        <button
          onClick={() => fetchCustomers()}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <button
          onClick={() => navigate("/customers/new")}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      {/* Segmentos */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(
          customers.reduce((acc, c) => {
            const id = c.segmento_id ?? 0;
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {})
        ).map(([id, count]) => {
          const labels = {
            0: "Sin segmento",
            1: "Bajo valor",
            2: "Medio valor",
            3: "Alto valor",
            4: "Nuevos",
          };
          const active = selectedSegment === Number(id);
          return (
            <button
              key={id}
              onClick={() => setSelectedSegment(active ? null : Number(id))}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                active
                  ? id === "0" ? "bg-slate-600 text-white border-slate-600"
                    : id === "1" ? "bg-red-600 text-white border-red-600"
                    : id === "2" ? "bg-amber-600 text-white border-amber-600"
                    : id === "3" ? "bg-green-600 text-white border-green-600"
                    : "bg-indigo-600 text-white border-indigo-600"
                  : id === "0" ? "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    : id === "1" ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                    : id === "2" ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                    : id === "3" ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                    : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
              }`}
            >
              {labels[id] || `Segmento ${id}`}: {count}
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center transition-colors">
            Filtros
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Compra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Compras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Probabilidad Churn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Cliente
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, idx) => (
                  <tr key={customer.id ?? idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.ultima_compra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTotalCompras(customer.total_compras)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-red-500 rounded-full"
                            style={{
                              width: `${
                                (customer.probabilidad_churn || 0) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {((customer.probabilidad_churn || 0) * 100).toFixed(
                            0
                          )}
                          %
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(customer.valor_cliente)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver/Editar cliente"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(customer.id, customer.nombre)
                          }
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <NoResults />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
