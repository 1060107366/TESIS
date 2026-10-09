// CustomerStore.js
import { create } from "zustand";
import { customerApiService } from "../services/customer/customerApiService.js";

export const useCustomerStore = create((set) => ({
  // Estado
  customers: [],
  selectedCustomer: null,
  isLoading: false,
  error: null,

  // Acciones básicas
  setCustomers: (customers) => set({ customers }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Acciones CRUD
  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await customerApiService.getCustomers();
      // ✅ CORRECCIÓN: Extraer el array 'clientes' de la respuesta
      const customers = response.clientes || []; 
      set({ customers, isLoading: false });
    } catch (error) {
      set({ error: error.message || "Error al cargar los clientes", isLoading: false, });
    }
  },

  createCustomer: async (customerData) => {
    set({ isLoading: true, error: null });
    try {
      const newCustomer = await customerApiService.createCustomer(customerData);
      set((state) => ({
        customers: [...state.customers, newCustomer],
        isLoading: false,
      }));
      return newCustomer;
    } catch (error) {
      set({
        error: error.message || "Error al crear el cliente",
        isLoading: false,
      });
      throw error;
    }
  },

  updateCustomer: async (id, customerData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCustomer = await customerApiService.updateCustomer(id, {
        action: "update_basic",
        ...customerData,
      });
      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.id === id ? { ...customer, ...updatedCustomer } : customer
        ),
        isLoading: false,
      }));
      return updatedCustomer;
    } catch (error) {
      set({
        error: error.message || "Error al actualizar el cliente",
        isLoading: false,
      });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await customerApiService.deleteCustomer(id);
      set((state) => ({
        customers: state.customers.filter((customer) => customer.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error.message || "Error al eliminar el cliente",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchCustomerDetails: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const [customer, interactions, metrics] = await Promise.all([
        customerApiService.getCustomerDetails(id),
        customerApiService.getCustomerInteractions(id),
        customerApiService.getCustomerMetrics(id),
      ]);

      const customerDetails = {
        ...customer,
        interacciones: interactions,
        metricas_historicas: metrics,
      };

      set({
        selectedCustomer: customerDetails,
        isLoading: false,
      });
      return customerDetails;
    } catch (error) {
      set({
        error: error.message || "Error al cargar los detalles del cliente",
        isLoading: false,
      });
      throw error;
    }
  },

  registerPurchase: async (id, purchaseData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCustomer = await customerApiService.registerPurchase(
        id,
        purchaseData
      );
      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.id === id ? { ...customer, ...updatedCustomer } : customer
        ),
        isLoading: false,
      }));
      return updatedCustomer;
    } catch (error) {
      set({
        error: error.message || "Error al registrar la compra",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchRecentActivity: async () => {
    set({ isLoading: true, error: null });
    try {
      const activity = await customerApiService.getRecentActivity();
      set({ isLoading: false });
      return activity;
    } catch (error) {
      set({
        error: error.message || "Error al cargar la actividad reciente",
        isLoading: false,
      });
      throw error;
    }
  },
}));
