import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, AlertTriangle, ChevronLeft } from "lucide-react";
import { useCustomerStore } from "../../stores/CustomerStore.js";

const CreateCustomer = () => {
  const navigate = useNavigate();
  const { createCustomer } = useCustomerStore();

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    valor_orden_total: "", // Campo opcional para la primera compra
    // Fecha de creacion se debe agregar automaticamente
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.nombre || !formData.email || !formData.telefono) {
      setError("Los campos nombre, email y teléfono son obligatorios");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("El formato del email no es válido");
      return false;
    }
    if (formData.valor_orden_total && isNaN(formData.valor_orden_total)) {
      setError("El valor de la orden debe ser un número válido");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const customerData = {
        ...formData,
        valor_orden_total: formData.valor_orden_total
          ? parseFloat(formData.valor_orden_total)
          : undefined,
      };

      await createCustomer(customerData);
      navigate("/customers");
    } catch (error) {
      setError(error.message || "Error al crear el cliente");
    } finally {
      setLoading(false);
    }
  };

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
              Nuevo Cliente
            </h1>
            <p className="text-sm text-gray-500">
              Ingrese los datos del nuevo cliente
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white shadow rounded-lg p-6">
        <form
          id="createCustomerForm"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nombre"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                id="nombre"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="telefono"
                className="block text-sm font-medium text-gray-700"
              >
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                id="telefono"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={formData.telefono}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="valor_orden_total"
                className="block text-sm font-medium text-gray-700"
              >
                Valor de primera compra (opcional)
              </label>
              <input
                type="number"
                name="valor_orden_total"
                id="valor_orden_total"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={formData.valor_orden_total}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {loading ? "Creando..." : "Crear Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomer;
