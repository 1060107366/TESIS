import { create } from "zustand";
import { fetchWithAuth } from "../services/auth/authService.js";

export const useUserStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,

  // Obtener información del usuario
  fetchUserInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchWithAuth("/auth/me");
      set({ user: response, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Actualizar información del usuario en el store
  updateUserInfo: (userData) => {
    set((state) => ({
      user: { ...state.user, ...userData },
    }));
  },

  // Limpiar información del usuario (por ejemplo, al cerrar sesión)
  clearUser: () => {
    set({ user: null, error: null });
  },
}));
