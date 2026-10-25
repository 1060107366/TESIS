import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

const VARIANTES = {
  primario: "bg-primary text-white shadow-[var(--shadow-glass)] hover:bg-primary-strong",
  secundario: "glass text-ink hover:bg-glass-strong",
  peligro: "bg-risk-high text-white hover:brightness-95",
  suave: "bg-primary-soft text-primary-strong hover:brightness-97",
  fantasma: "text-ink-soft hover:bg-white/50 hover:text-ink",
};
const TAMANOS = {
  normal: "min-h-12 px-4 text-base",
  pequeno: "min-h-10 px-3 text-sm",
  grande: "min-h-14 px-6 text-lg",
};

const clasesBoton = (variante, tamano, extra) =>
  `inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors
   disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`;

export function Boton({ variante = "primario", tamano = "normal", icono: Icono, cargando, className = "", children, ...props }) {
  return (
    <button className={clasesBoton(variante, tamano, className)} disabled={cargando || props.disabled} {...props}>
      {cargando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : Icono && <Icono className="size-5" aria-hidden />}
      {children}
    </button>
  );
}

export function BotonEnlace({ a, variante = "primario", tamano = "normal", icono: Icono, className = "", children, ...props }) {
  const externo = /^(https?:|tel:)/.test(a);
  const clases = clasesBoton(variante, tamano, className);
  const contenido = (
    <>
      {Icono && <Icono className="size-5" aria-hidden />}
      {children}
    </>
  );
  return externo ? (
    <a href={a} className={clases} target={a.startsWith("http") ? "_blank" : undefined} rel="noreferrer" {...props}>
      {contenido}
    </a>
  ) : (
    <Link to={a} className={clases} {...props}>
      {contenido}
    </Link>
  );
}

const claseCampo =
  "w-full min-h-12 rounded-control border border-white/80 bg-white/75 px-4 text-base text-ink " +
  "placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";

export const Campo = forwardRef(function Campo({ etiqueta, ayuda, error, id, className = "", ...props }, ref) {
  const idCampo = id || props.name;
  return (
    <div className={className}>
      {etiqueta && (
        <label htmlFor={idCampo} className="mb-1.5 block text-sm font-medium text-ink">
          {etiqueta}
        </label>
      )}
      <input ref={ref} id={idCampo} className={claseCampo} aria-invalid={Boolean(error)} {...props} />
      {error ? (
        <p className="mt-1.5 text-sm text-risk-high">{error}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-sm text-ink-faint">{ayuda}</p>
      )}
    </div>
  );
});

// Botones tipo "píldora" para filtrar
export function Filtro({ activo, onClick, children, conteo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex min-h-10 items-center gap-2 rounded-chip px-4 text-sm font-medium transition-colors ${
        activo ? "bg-ink text-white" : "glass text-ink-soft hover:text-ink"
      }`}
    >
      {children}
      {conteo != null && (
        <span className={`tabular rounded-chip px-2 text-xs ${activo ? "bg-white/20" : "bg-white/70"}`}>{conteo}</span>
      )}
    </button>
  );
}
