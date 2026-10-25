import { NIVELES, nivelRiesgo, segmento } from "../../lib/significados.js";
import { color as resolver } from "../../lib/tokens.js";

export function EtiquetaSegmento({ id, perfil }) {
  const s = segmento(id);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-chip px-3 py-1 text-sm font-medium ${s.clases}`}>
      <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
      {perfil || s.nombre}
    </span>
  );
}

export function EtiquetaRiesgo({ probabilidad, nivel }) {
  const n = NIVELES[nivel || nivelRiesgo(probabilidad)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-chip px-3 py-1 text-sm font-medium ${n.clases}`}>
      <span className="size-2 rounded-full" style={{ background: n.color }} aria-hidden />
      {n.nombre}
    </span>
  );
}

// Barra semicircular que muestra la probabilidad de que el cliente no vuelva
export function MedidorRiesgo({ probabilidad }) {
  const nivel = nivelRiesgo(probabilidad);
  const n = NIVELES[nivel];
  const p = probabilidad == null ? 0 : Math.min(1, Math.max(0, probabilidad));
  const largo = Math.PI * 80;
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-60" role="img"
           aria-label={probabilidad == null ? n.frase : `${Math.round(p * 100)} % de probabilidad de no volver`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="white" strokeOpacity="0.8" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={resolver(n.color)} strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${largo * p} ${largo}`} />
        <text x="100" y="92" textAnchor="middle" className="tabular" fill={resolver("var(--color-ink)")} fontSize="34" fontWeight="600">
          {probabilidad == null ? "—" : `${Math.round(p * 100)}%`}
        </text>
      </svg>
      <figcaption className="mt-1 text-center">
        <span className="font-semibold" style={{ color: n.color }}>{n.nombre}</span>
        <span className="block text-sm text-ink-soft">{n.frase}</span>
      </figcaption>
    </figure>
  );
}
