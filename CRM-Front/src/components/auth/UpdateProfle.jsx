/* eslint-disable react/prop-types */
import { useState } from "react";
import { UserCog } from "lucide-react";
import { authApiService } from "../../services/auth/authApiService.js";

const UpdateProfile = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    usuario: "",
    email: "",
    contrasena: "",
    confirmContrasena: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.usuario && !formData.email && !formData.contrasena) {
      setError("Debes modificar al menos un campo");
      return false;
    }
    if (formData.contrasena && formData.contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (formData.contrasena !== formData.confirmContrasena) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Solo enviar los campos que han sido modificados
      const updateData = {};
      if (formData.usuario) updateData.usuario = formData.usuario;
      if (formData.email) updateData.email = formData.email;
      if (formData.contrasena) updateData.contrasena = formData.contrasena;

      await authApiService.updateProfile(updateData);
      setSuccessMessage("Perfil actualizado exitosamente");
      setFormData({
        usuario: "",
        email: "",
        contrasena: "",
        confirmContrasena: "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <UserCog className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Actualizar Perfil
          </h3>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="usuario"
              type="text"
              placeholder="Nuevo nombre de usuario"
              value={formData.usuario}
              onChange={handleChange}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
          </div>
          <div>
            <input
              name="email"
              type="email"
              placeholder="Nuevo correo electrónico"
              value={formData.email}
              onChange={handleChange}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
          </div>
          <div>
            <input
              name="contrasena"
              type="password"
              placeholder="Nueva contraseña"
              value={formData.contrasena}
              onChange={handleChange}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
          </div>
          <div>
            <input
              name="confirmContrasena"
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={formData.confirmContrasena}
              onChange={handleChange}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Actualizando...
                </span>
              ) : (
                "Actualizar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
