import { create } from "zustand";
import { cuenta } from "../api/crm.js";
import { sesion as almacen } from "../lib/http.js";

// Sesión del usuario (la tienda) y avisos emergentes.
export const useSesion = create((set, get) => ({
  usuario: null,
  activa: almacen.activa(),

  ingresar: async (email, contrasena) => {
    const { access_token } = await cuenta.ingresar(email, contrasena);
    almacen.guardar(access_token);
    set({ activa: true });
    await get().cargarUsuario();
  },

  crearCuenta: async (usuario, email, contrasena) => {
    const { access_token } = await cuenta.crear(usuario, email, contrasena);
    almacen.guardar(access_token);
    set({ activa: true });
    await get().cargarUsuario();
  },

  cargarUsuario: async () => {
    try {
      set({ usuario: await cuenta.yo() });
    } catch {
      /* si el token venció, http.js ya cerró la sesión */
    }
  },

  actualizarUsuario: (cambios) => set((s) => ({ usuario: { ...s.usuario, ...cambios } })),

  salir: () => {
    almacen.cerrar();
    set({ activa: false, usuario: null });
  },
}));

let siguienteId = 1;
export const useAvisos = create((set) => ({
  avisos: [],
  avisar: (texto, tipo = "exito") => {
    const id = siguienteId++;
    set((s) => ({ avisos: [...s.avisos, { id, texto, tipo }] }));
    setTimeout(() => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })), 4500);
  },
  quitar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
}));

export const avisar = (texto, tipo) => useAvisos.getState().avisar(texto, tipo);
