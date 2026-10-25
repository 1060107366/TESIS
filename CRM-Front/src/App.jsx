import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RutaProtegida } from "./components/layout/Marco.jsx";
import { CrearCuenta, Ingresar } from "./pages/Acceso.jsx";

// Cada pantalla se descarga solo cuando se abre (carga más rápida en el celular)
const Inicio = lazy(() => import("./pages/Inicio.jsx"));
const Clientes = lazy(() => import("./pages/Clientes.jsx"));
const ClienteDetalle = lazy(() => import("./pages/ClienteDetalle.jsx"));
const RegistrarVenta = lazy(() => import("./pages/RegistrarVenta.jsx"));
const MiTienda = lazy(() => import("./pages/MiTienda.jsx"));
const Ofertas = lazy(() => import("./pages/Ofertas.jsx"));
const MiCuenta = lazy(() => import("./pages/MiCuenta.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ingresar" element={<Ingresar />} />
        <Route path="/crear-cuenta" element={<CrearCuenta />} />
        <Route element={<RutaProtegida />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route path="/vender" element={<RegistrarVenta />} />
          <Route path="/mi-tienda" element={<MiTienda />} />
          <Route path="/ofertas" element={<Ofertas />} />
          <Route path="/mi-cuenta" element={<MiCuenta />} />
        </Route>
        {/* Direcciones de la versión anterior y cualquier otra: al inicio */}
        <Route path="/login" element={<Navigate to="/ingresar" replace />} />
        <Route path="/register" element={<Navigate to="/crear-cuenta" replace />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
