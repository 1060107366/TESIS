import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useAvisos } from "../../stores/sesion.js";
import { Boton } from "./Controles.jsx";

export function Cargando({ lineas = 3, className = "" }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} role="status" aria-label="Cargando">
      {Array.from({ length: lineas }, (_, i) => (
        <div key={i} className="h-4 rounded-full bg-white/70" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function ErrorCaja({ error, onReintentar }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-control bg-risk-high-soft/80 p-4 text-risk-high" role="alert">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>{error?.message || "No se pudo cargar esta información."}</span>
      </p>
      {onReintentar && (
        <Boton variante="secundario" tamano="pequeno" onClick={() => onReintentar()}>
          Intentar de nuevo
        </Boton>
      )}
    </div>
  );
}

export function Vacio({ icono: Icono = Info, titulo, texto, accion }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <Icono className="size-8 text-ink-faint" aria-hidden />
      <p className="font-medium text-ink">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-ink-soft">{texto}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

// Ventana emergente accesible (cierra con Escape o tocando fuera)
export function Ventana({ abierta, onCerrar, titulo, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);
  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      className="glass-strong m-auto w-[min(34rem,calc(100%-2rem))] rounded-tile p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
    >
      {abierta && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button onClick={onCerrar} className="rounded-full p-1 text-ink-soft hover:bg-white/60" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Avisos() {
  const { avisos, quitar } = useAvisos();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id}
             className="glass-strong pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-control px-4 py-3">
          {a.tipo === "error" ? (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-risk-high" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          )}
          <p className="flex-1">{a.texto}</p>
          <button onClick={() => quitar(a.id)} className="text-ink-faint hover:text-ink" aria-label="Cerrar aviso">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
