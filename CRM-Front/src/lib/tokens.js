// Los gráficos SVG no entienden var(--color-…) en sus atributos:
// esta función convierte un token del sistema de diseño en su color real.
export function color(valor) {
  const m = /^var\((--[\w-]+)\)$/.exec(String(valor || "").trim());
  if (!m || typeof window === "undefined") return valor;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || valor;
}
