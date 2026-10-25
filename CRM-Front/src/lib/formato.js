// Formatos en español de Colombia

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
const fechaHora = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const cop = (v) => pesos.format(Number(v) || 0);

// Cifras grandes en corto: $1,2 M · $350 mil
export const copCorto = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `$${numero.format(n / 1_000_000)} M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)} mil`;
  return cop(n);
};

export const num = (v) => numero.format(Number(v) || 0);
export const porcentaje = (p) => (p == null ? "—" : `${Math.round(Number(p) * 100)} %`);

// El backend guarda fechas en UTC sin zona; se interpretan como UTC
export const aFecha = (texto) => {
  if (!texto) return null;
  const t = String(texto);
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(t) ? t : `${t.replace(" ", "T")}Z`);
};

export const fecha = (texto) => {
  const d = aFecha(texto);
  return d ? fechaCorta.format(d) : "—";
};

export const fechaYHora = (texto) => {
  const d = aFecha(texto);
  return d ? fechaHora.format(d) : "—";
};

export const haceCuanto = (texto) => {
  const d = aFecha(texto);
  if (!d) return "Nunca";
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? "Hace 1 mes" : `Hace ${meses} meses`;
  const anios = Math.floor(meses / 12);
  return anios === 1 ? "Hace más de 1 año" : `Hace más de ${anios} años`;
};

// Valor para <input type="datetime-local"> -> formato que acepta el backend
export const aFechaBackend = (valorInput) => (valorInput ? `${valorInput.replace("T", " ")}:00` : undefined);

// Teléfonos de Colombia para llamada y WhatsApp
const soloDigitos = (t) => String(t || "").replace(/\D/g, "");
export const enlaceLlamada = (tel) => (soloDigitos(tel) ? `tel:+${conIndicativo(tel)}` : null);
export const enlaceWhatsApp = (tel, mensaje) =>
  soloDigitos(tel) ? `https://wa.me/${conIndicativo(tel)}?text=${encodeURIComponent(mensaje)}` : null;
function conIndicativo(tel) {
  const d = soloDigitos(tel);
  return d.length === 10 && d.startsWith("3") ? `57${d}` : d;
}

export const primerNombre = (nombre) => String(nombre || "").trim().split(/\s+/)[0] || "";
