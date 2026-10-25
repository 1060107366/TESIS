import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { BellRing, ShoppingBag, Store, Users } from "lucide-react";
import { useSesion } from "../stores/sesion.js";
import { Boton, Campo } from "../components/ui/Controles.jsx";
import { Avisos } from "../components/ui/Estados.jsx";

function MarcoAcceso({ children }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-5">
        <section className="glass hidden flex-col justify-between rounded-tile p-8 lg:col-span-2 lg:flex">
          <div>
            <span className="grid size-14 place-items-center rounded-control bg-primary text-white">
              <Store className="size-7" aria-hidden />
            </span>
            <h1 className="mt-6 text-2xl font-semibold leading-tight">Conozca a sus clientes y no deje que se vayan</h1>
          </div>
          <ul className="mt-8 space-y-5 text-ink-soft">
            <li className="flex gap-3"><ShoppingBag className="size-6 shrink-0 text-primary" aria-hidden />Anote cada venta en segundos, desde el celular.</li>
            <li className="flex gap-3"><BellRing className="size-6 shrink-0 text-risk-mid" aria-hidden />Sepa qué clientes están dejando de venir y llámelos a tiempo.</li>
            <li className="flex gap-3"><Users className="size-6 shrink-0 text-seg-high" aria-hidden />Identifique a sus mejores clientes y ofrézcales lo justo.</li>
          </ul>
        </section>
        <section className="glass rounded-tile p-6 sm:p-10 lg:col-span-3">{children}</section>
      </div>
      <Avisos />
    </div>
  );
}

export function Ingresar() {
  const { activa, ingresar } = useSesion();
  const navegar = useNavigate();
  const desde = useLocation().state?.desde || "/inicio";
  const [form, setForm] = useState({ email: "", contrasena: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (activa) return <Navigate to="/inicio" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.contrasena) return setError("Escriba su correo y su contraseña.");
    setCargando(true);
    try {
      await ingresar(form.email.trim(), form.contrasena);
      navegar(desde, { replace: true });
    } catch (err) {
      setError(err.estado === 401 ? "El correo o la contraseña no coinciden." : err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <MarcoAcceso>
      <h2 className="text-xl font-semibold">Ingresar a su tienda</h2>
      <p className="mt-1 text-ink-soft">Use el correo con el que creó su cuenta.</p>
      <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
        <Campo etiqueta="Correo" name="email" type="email" autoComplete="email" inputMode="email"
               value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Campo etiqueta="Contraseña" name="contrasena" type="password" autoComplete="current-password"
               value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} />
        {error && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high" role="alert">{error}</p>}
        <Boton type="submit" tamano="grande" className="w-full" cargando={cargando}>Ingresar</Boton>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        ¿Aún no tiene cuenta? <Link to="/crear-cuenta" className="font-medium text-primary underline-offset-4 hover:underline">Crear una cuenta</Link>
      </p>
    </MarcoAcceso>
  );
}

export function CrearCuenta() {
  const { activa, crearCuenta } = useSesion();
  const navegar = useNavigate();
  const [form, setForm] = useState({ usuario: "", email: "", contrasena: "", confirmar: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (activa) return <Navigate to="/inicio" replace />;

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.usuario.trim() || !form.email.trim()) return setError("Escriba el nombre de su tienda y su correo.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("El correo no parece válido. Revíselo.");
    if (form.contrasena.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (form.contrasena !== form.confirmar) return setError("Las dos contraseñas no coinciden.");
    setCargando(true);
    try {
      await crearCuenta(form.usuario.trim(), form.email.trim(), form.contrasena);
      navegar("/inicio", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <MarcoAcceso>
      <h2 className="text-xl font-semibold">Crear la cuenta de su tienda</h2>
      <p className="mt-1 text-ink-soft">Solo toma un minuto.</p>
      <form onSubmit={enviar} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
        <Campo className="sm:col-span-2" etiqueta="Nombre de la tienda" name="usuario" autoComplete="organization"
               placeholder="Ej.: Tienda Doña Rosa" value={form.usuario} onChange={cambiar("usuario")} />
        <Campo className="sm:col-span-2" etiqueta="Correo" name="email" type="email" autoComplete="email"
               value={form.email} onChange={cambiar("email")} />
        <Campo etiqueta="Contraseña" name="contrasena" type="password" autoComplete="new-password"
               ayuda="Mínimo 6 caracteres" value={form.contrasena} onChange={cambiar("contrasena")} />
        <Campo etiqueta="Repita la contraseña" name="confirmar" type="password" autoComplete="new-password"
               value={form.confirmar} onChange={cambiar("confirmar")} />
        {error && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high sm:col-span-2" role="alert">{error}</p>}
        <Boton type="submit" tamano="grande" className="sm:col-span-2" cargando={cargando}>Crear cuenta</Boton>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        ¿Ya tiene cuenta? <Link to="/ingresar" className="font-medium text-primary underline-offset-4 hover:underline">Ingresar</Link>
      </p>
    </MarcoAcceso>
  );
}
