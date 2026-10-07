// customerApiService.js
import { fetchWithAuth } from "../auth/authService.js";

export const customerApiService = {
  // Obtener todos los clientes
  async getCustomers() {
    return await fetchWithAuth("/customer/", {
      method: "GET",
    });
  },

  // Crear nuevo cliente
  async createCustomer(customerData) {
    return await fetchWithAuth("/customer/create", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  },

  // Actualizar cliente
  async updateCustomer(id, customerData) {
    return await fetchWithAuth(`/customer/update/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
  },

  // Eliminar cliente
  async deleteCustomer(id) {
    return await fetchWithAuth(`/customer/delete/${id}`, {
      method: "DELETE",
    });
  },

  // Obtener detalles de un cliente
  async getCustomerDetails(id) {
    return await fetchWithAuth(`/customer/${id}`, {
      method: "GET",
    });
  },

  // Obtener interacciones de un cliente
  async getCustomerInteractions(id) {
    return await fetchWithAuth(`/customer/${id}/interacciones`, {
      method: "GET",
    });
  },

  // Obtener métricas de un cliente
  async getCustomerMetrics(id) {
    return await fetchWithAuth(`/customer/metrics/${id}`, {
      method: "GET",
    });
  },

  // Registrar nueva compra
  async registerPurchase(id, purchaseData) {
    return await fetchWithAuth(`/customer/update/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        action: "new_interaction",
        data_interaccion: {
          tipo_interaccion_id: 2,
          ...purchaseData,
        },
      }),
    });
  },

  // Obtener actividad reciente
  async getRecentActivity() {
    return await fetchWithAuth("/customer/actividad-reciente", {
      method: "GET",
    });
  },
};