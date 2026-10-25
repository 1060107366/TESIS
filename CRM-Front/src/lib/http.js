// Cliente HTTP único para hablar con el backend (Flask).
// - Agrega el token de sesión.
// - Convierte los errores del backend en mensajes legibles (campo `message`).
// - Si la sesión venció (401), cierra la sesión y vuelve a la pantalla de ingreso.

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/$/, "");
const TIEMPO_MAXIMO_MS = 20000;
const CLAVE_TOKEN = "crm_token";

export const sesion = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (token) => localStorage.setItem(CLAVE_TOKEN, token),
  cerrar: () => localStorage.removeItem(CLAVE_TOKEN),
  activa: () => Boolean(localStorage.getItem(CLAVE_TOKEN)),
};

export class ApiError extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

export async function pedir(metodo, ruta, cuerpo) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  const token = sesion.token();
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw new ApiError("El servidor tardó demasiado en responder. Intente de nuevo.", 0);
    throw new ApiError("No hay conexión con el servidor. Revise que el backend esté encendido.", 0);
  } finally {
    clearTimeout(temporizador);
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      sesion.cerrar();
      window.dispatchEvent(new Event("sesion-vencida"));
    }
    const mensaje = traducir(datos?.message || datos?.error || datos?.msg) || "No se pudo completar la acción.";
    throw new ApiError(mensaje, respuesta.status, datos);
  }
  return datos;
}

// Algunos mensajes vienen de librerías en inglés
function traducir(mensaje) {
  if (!mensaje) return mensaje;
  if (/token has expired/i.test(mensaje)) return "Su sesión venció. Ingrese de nuevo.";
  if (/missing authorization/i.test(mensaje)) return "Debe ingresar para continuar.";
  if (/requested url was not found/i.test(mensaje)) return "No se encontró lo que buscaba.";
  return mensaje;
}

export const get = (ruta) => pedir("GET", ruta);
export const post = (ruta, cuerpo = {}) => pedir("POST", ruta, cuerpo);
export const put = (ruta, cuerpo = {}) => pedir("PUT", ruta, cuerpo);
export const del = (ruta) => pedir("DELETE", ruta);
