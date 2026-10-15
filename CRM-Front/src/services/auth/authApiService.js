import { fetchWithAuth, setToken, removeToken } from "./authService.js";

export const authApiService = {
  async register(userData) {
    const response = await fetchWithAuth("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response;
  },

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
      throw new Error(error.message || "Error en el inicio de sesion");
    }
  },

  // Backend no expone /auth/logout; se limpia sesion local
  async logout() {
    removeToken();
  },

  async updateProfile(userData) {
    return await fetchWithAuth("/auth/update", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async userInfo() {
    return await fetchWithAuth("/auth/me", {
      method: "GET",
    });
  },
};
