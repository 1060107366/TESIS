import { useEffect, useState } from "react";
import { clientes } from "../api/crm.js";
import { avisar } from "../stores/sesion.js";
import { Boton, Campo } from "./ui/Controles.jsx";
import { Ventana } from "./ui/Estados.jsx";

const VACIO = { nombre: "", telefono: "", email: "", valor_orden_total: "" };

/** Crear (sin `cliente`) o editar (con `cliente`) en una ventana emergente. */
export function FormularioCliente({ abierta, onCerrar, cliente, onGuardado }) {
  const editando = Boolean(cliente);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierta) {
      setForm(cliente ? { nombre: cliente.nombre, telefono: cliente.telefono || "", email: cliente.email, valor_orden_total: "" } : VACIO);
      setErrores({});
    }
  }, [abierta, cliente]);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Escriba el nombre del cliente.";
    if (!/^\d{7,10}$/.test(form.telefono.replace(/\D/g, ""))) e.telefono = "Escriba un teléfono de 7 a 10 números.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Escriba un correo válido.";
    if (form.valor_orden_total && !(Number(form.valor_orden_total) > 0)) e.valor_orden_total = "Escriba un valor mayor que 0.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    const datos = { nombre: form.nombre.trim(), telefono: form.telefono.replace(/\D/g, ""), email: form.email.trim() };
    try {
      const r = editando
        ? await clientes.actualizar(cliente.id, datos)
        : await clientes.crear({ ...datos, ...(form.valor_orden_total ? { valor_orden_total: Number(form.valor_orden_total) } : {}) });
      avisar(editando ? "Cliente actualizado." : `Cliente ${datos.nombre} guardado.`);
      onGuardado?.(r);
      onCerrar();
    } catch (err) {
      setErrores({ general: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Ventana abierta={abierta} onCerrar={onCerrar} titulo={editando ? "Editar cliente" : "Nuevo cliente"}>
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <Campo etiqueta="Nombre completo" name="nombre" autoComplete="name" value={form.nombre} onChange={cambiar("nombre")} error={errores.nombre} />
        <Campo etiqueta="Celular" name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="3001234567"
               ayuda="Para escribirle por WhatsApp" value={form.telefono} onChange={cambiar("telefono")} error={errores.telefono} />
        <Campo etiqueta="Correo" name="email" type="email" inputMode="email" value={form.email} onChange={cambiar("email")} error={errores.email} />
        {!editando && (
          <Campo etiqueta="¿Compró algo hoy? Valor de la compra (opcional)" name="valor_orden_total" type="number" inputMode="numeric"
                 min="0" step="100" placeholder="Ej.: 25000" value={form.valor_orden_total} onChange={cambiar("valor_orden_total")}
                 error={errores.valor_orden_total} />
        )}
        {errores.general && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high" role="alert">{errores.general}</p>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Boton type="button" variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardando}>{editando ? "Guardar cambios" : "Guardar cliente"}</Boton>
        </div>
      </form>
    </Ventana>
  );
}
