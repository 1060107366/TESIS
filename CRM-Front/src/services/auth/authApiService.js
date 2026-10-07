import { fetchWithAuth, setToken, removeToken } from "./authService.js";

export const authApiService = {
  // Registro de usuario
  async register(userData) {
    const response = await fetchWithAuth("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response;
  },

  // Inicio de sesión
  async login(credentials) {
    try {
      const response = await fetchWithAuth("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (response.access_token) {
        setToken(response.access_token);
      }

      return response;
    } catch (error) {
      throw new Error(error.message || "Error en el inicio de sesión");
    }
  },

  // Cerrar sesión
  async logout() {
    try {
      await fetchWithAuth("/auth/logout", {
        method: "POST",
      });
    } finally {
      removeToken();
    }
  },

  async updateProfile(userData) {
    return await fetchWithAuth("/auth/update", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async userInfo(userData) {
    return await fetchWithAuth("/auth/me", {
      method: "GET",
      body: JSON.stringify(userData),
    });
  },
};
