// Gráficos con Recharts usando los colores del sistema de diseño
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cop, copCorto, num } from "../lib/formato.js";
import { color as resolver } from "../lib/tokens.js";

const ejes = () => ({ fontSize: 13, fill: resolver("var(--color-ink-faint)") });

function Burbuja({ active, payload, label, dinero, unidad }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="glass-strong rounded-control px-3 py-2 text-sm">
      <p className="text-ink-soft">{label}</p>
      <p className="tabular font-semibold text-ink">{dinero ? cop(v) : `${num(v)} ${unidad || ""}`}</p>
    </div>
  );
}

/** Barras por mes; el último mes (el actual) se resalta. */
export function BarrasPorMes({ datos, dinero = false, unidad, alto = 240, color = "var(--color-primary)" }) {
  const relleno = resolver(color);
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={datos} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="white" strokeOpacity={0.8} />
          <XAxis dataKey="month" tickFormatter={(m) => String(m).split(" ")[0]} tick={ejes()} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => (dinero ? copCorto(v) : num(v))} tick={ejes()} axisLine={false} tickLine={false} width={dinero ? 64 : 36} />
          <Tooltip cursor={{ fill: "white", fillOpacity: 0.35 }} content={<Burbuja dinero={dinero} unidad={unidad} />} />
          <Bar dataKey="value" radius={[8, 8, 3, 3]} maxBarSize={44} isAnimationActive={false}>
            {datos.map((_, i) => (
              <Cell key={i} fill={relleno} fillOpacity={i === datos.length - 1 ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontales simples (sin librería) para conteos por categoría. */
export function BarrasConteo({ filas }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.nombre}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-ink">{f.nombre}</span>
            <span className="tabular text-sm text-ink-soft">{num(f.valor)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full" style={{ width: `${(f.valor / max) * 100}%`, background: f.color }} />
          </div>
          {f.nota && <p className="mt-1 text-xs text-ink-faint">{f.nota}</p>}
        </li>
      ))}
    </ul>
  );
}
