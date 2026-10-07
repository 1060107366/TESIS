import config from "../../config/config.js";

export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

export const getAuthHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    Accept: "application/json",
  };
};

export const fetchWithAuth = async (endpoint, options = {}) => {
  const url = `${config.API_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.API_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      credentials: "include", // Importante para CORS
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Para peticiones OPTIONS, retornar OK
    if (response.status === 204) {
      return null;
    }

    // Para otros errores
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error en la petición");
    }

    // Solo intentar parsear JSON si hay contenido
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return null;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La solicitud excedió el tiempo límite");
    }
    throw error;
  }
};
