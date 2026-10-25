import { Suspense, useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Gift, Home, LogOut, ShoppingBag, Store, UserRound, Users } from "lucide-react";
import { avisar, useSesion } from "../../stores/sesion.js";
import { Avisos, Cargando } from "../ui/Estados.jsx";

const MENU = [
  { a: "/inicio", texto: "Inicio", icono: Home },
  { a: "/clientes", texto: "Clientes", icono: Users },
  { a: "/vender", texto: "Registrar venta", corto: "Vender", icono: ShoppingBag, destacado: true },
  { a: "/mi-tienda", texto: "Cómo va mi tienda", corto: "Mi tienda", icono: BarChart3 },
  { a: "/ofertas", texto: "Ofertas", icono: Gift },
];

export function RutaProtegida() {
  const activa = useSesion((s) => s.activa);
  const ubicacion = useLocation();
  if (!activa) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />;
  return <Marco />;
}

function Marco() {
  const { usuario, cargarUsuario, salir } = useSesion();
  const navegar = useNavigate();

  useEffect(() => {
    if (!usuario) cargarUsuario();
  }, [usuario, cargarUsuario]);

  useEffect(() => {
    const alVencer = () => {
      salir();
      avisar("Su sesión venció. Ingrese de nuevo.", "error");
      navegar("/ingresar", { replace: true });
    };
    window.addEventListener("sesion-vencida", alVencer);
    return () => window.removeEventListener("sesion-vencida", alVencer);
  }, [salir, navegar]);

  const cerrarSesion = () => {
    salir();
    navegar("/ingresar", { replace: true });
  };

  const tienda = usuario?.usuario || "Mi tienda";

  return (
    <div className="min-h-dvh lg:pl-72">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 glass-strong rounded-control px-4 py-2">
        Saltar al contenido
      </a>

      {/* Menú lateral (escritorio) */}
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-64 flex-col rounded-tile p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <span className="grid size-11 place-items-center rounded-control bg-primary text-white">
            <Store className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{tienda}</p>
            <p className="text-xs text-ink-faint">Clientes y ventas</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Menú principal">
          {MENU.map((m) => (
            <NavLink key={m.a} to={m.a}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-control px-3 font-medium transition-colors ${
                  isActive ? "bg-ink text-white" : m.destacado ? "bg-primary-soft text-primary-strong hover:brightness-97" : "text-ink-soft hover:bg-white/60 hover:text-ink"
                }`}>
              <m.icono className="size-5" aria-hidden />
              {m.texto}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-white/70 pt-3">
          <NavLink to="/mi-cuenta"
            className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-control px-3 font-medium ${isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-white/60"}`}>
            <UserRound className="size-5" aria-hidden /> Mi cuenta
          </NavLink>
          <button onClick={cerrarSesion} className="flex min-h-12 items-center gap-3 rounded-control px-3 font-medium text-ink-soft hover:bg-white/60">
            <LogOut className="size-5" aria-hidden /> Salir
          </button>
        </div>
      </aside>

      {/* Barra superior (celular y tableta) */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 rounded-b-tile px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 place-items-center rounded-control bg-primary text-white">
            <Store className="size-5" aria-hidden />
          </span>
          <p className="truncate font-semibold">{tienda}</p>
        </div>
        <NavLink to="/mi-cuenta" className="grid size-11 place-items-center rounded-full bg-white/70" aria-label="Mi cuenta">
          <UserRound className="size-5" />
        </NavLink>
      </header>

      <main id="contenido" className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        <Suspense fallback={<div className="glass rounded-tile p-6"><Cargando lineas={5} /></div>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Navegación inferior (celular y tableta) */}
      <nav className="glass-strong fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-tile p-1.5 lg:hidden" aria-label="Menú principal">
        {MENU.map((m) => (
          <NavLink key={m.a} to={m.a}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control text-xs font-medium ${
                m.destacado ? (isActive ? "bg-primary-strong text-white" : "bg-primary text-white") : isActive ? "bg-ink text-white" : "text-ink-soft"
              }`}>
            <m.icono className="size-5" aria-hidden />
            {m.corto || m.texto}
          </NavLink>
        ))}
      </nav>

      <Avisos />
    </div>
  );
}
