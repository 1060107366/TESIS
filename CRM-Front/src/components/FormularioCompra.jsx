import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { clientes } from "../api/crm.js";
import { aFechaBackend, cop } from "../lib/formato.js";
import { avisar } from "../stores/sesion.js";
import { Boton, Campo, Filtro } from "./ui/Controles.jsx";

const MONTOS_RAPIDOS = [5000, 10000, 20000, 50000];

/** Registrar una compra de un cliente. Llama a onRegistrada(respuesta) al terminar. */
export function FormularioCompra({ cliente, onRegistrada, botonGrande = false }) {
  const [monto, setMonto] = useState("");
  const [cuando, setCuando] = useState("hoy");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    const valor = Number(monto);
    if (!(valor > 0)) return setError("Escriba cuánto compró (mayor que 0).");
    if (cuando === "otra" && !fecha) return setError("Elija la fecha y hora de la compra.");
    setGuardando(true);
    try {
      const r = await clientes.registrarCompra(cliente.id, valor, cuando === "otra" ? aFechaBackend(fecha) : undefined);
      avisar(`Venta de ${cop(valor)} registrada para ${cliente.nombre}.`);
      setMonto("");
      setFecha("");
      setCuando("hoy");
      onRegistrada?.(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const maxFecha = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate>
      <Campo etiqueta="¿Cuánto compró?" name="monto" type="number" inputMode="numeric" min="0" step="100"
             placeholder="Ej.: 25000" value={monto} onChange={(e) => setMonto(e.target.value)}
             ayuda={Number(monto) > 0 ? cop(monto) : "Solo números, sin puntos"} />
      <div className="flex flex-wrap gap-2" aria-label="Valores rápidos">
        {MONTOS_RAPIDOS.map((v) => (
          <Filtro key={v} activo={Number(monto) === v} onClick={() => setMonto(String(v))}>{cop(v)}</Filtro>
        ))}
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">¿Cuándo fue la compra?</legend>
        <div className="flex flex-wrap gap-2">
          <Filtro activo={cuando === "hoy"} onClick={() => setCuando("hoy")}>Ahora</Filtro>
          <Filtro activo={cuando === "otra"} onClick={() => setCuando("otra")}>Otro día</Filtro>
        </div>
        {cuando === "otra" && (
          <Campo className="mt-3" etiqueta="Fecha y hora" name="fecha" type="datetime-local" max={maxFecha}
                 value={fecha} onChange={(e) => setFecha(e.target.value)} />
        )}
      </fieldset>
      {error && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high" role="alert">{error}</p>}
      <Boton type="submit" icono={CheckCircle2} cargando={guardando} tamano={botonGrande ? "grande" : "normal"} className="w-full">
        Registrar venta
      </Boton>
    </form>
  );
}
