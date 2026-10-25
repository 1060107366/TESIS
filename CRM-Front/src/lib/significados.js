// Cómo se le explica al tendero lo que calculan los modelos de IA.
// Aquí se cambian los textos y los colores de segmentos y niveles de riesgo.

export const SEGMENTOS = {
  3: {
    nombre: "Alto valor",
    corto: "Sus mejores clientes",
    explicacion: "Compran seguido, hace poco y gastan varias veces más que un cliente típico de su tienda.",
    clases: "bg-seg-high-soft text-seg-high",
    color: "var(--color-seg-high)",
  },
  2: {
    nombre: "Medio valor",
    corto: "Clientes regulares",
    explicacion: "Compran con frecuencia o gasto moderados. Algunos vienen seguido y otros se están alejando.",
    clases: "bg-seg-mid-soft text-seg-mid",
    color: "var(--color-seg-mid)",
  },
  1: {
    nombre: "Bajo valor",
    corto: "Compran poco",
    explicacion: "Compran poco, hace tiempo o gastan menos que el cliente típico de su tienda.",
    clases: "bg-seg-low-soft text-seg-low",
    color: "var(--color-seg-low)",
  },
  4: {
    nombre: "Nuevos",
    corto: "Aún sin compras",
    explicacion: "Clientes registrados que todavía no tienen compras.",
    clases: "bg-seg-new-soft text-seg-new",
    color: "var(--color-seg-new)",
  },
};

export const segmento = (id) =>
  SEGMENTOS[id] ?? { nombre: "Sin clasificar", corto: "Sin clasificar", explicacion: "", clases: "bg-seg-low-soft text-seg-low", color: "var(--color-seg-low)" };

// Umbrales iguales a los del modelo de abandono (modelos/v2.0.0: medio 0,50 · alto 0,65)
export const UMBRAL_MEDIO = 0.5;
export const UMBRAL_ALTO = 0.65;

export const NIVELES = {
  alto: {
    nombre: "Riesgo alto",
    frase: "Es probable que no vuelva",
    clases: "bg-risk-high-soft text-risk-high",
    color: "var(--color-risk-high)",
  },
  medio: {
    nombre: "Riesgo medio",
    frase: "Se está alejando",
    clases: "bg-risk-mid-soft text-risk-mid",
    color: "var(--color-risk-mid)",
  },
  bajo: {
    nombre: "Riesgo bajo",
    frase: "Viene con normalidad",
    clases: "bg-risk-low-soft text-risk-low",
    color: "var(--color-risk-low)",
  },
  ninguno: {
    nombre: "Sin compras",
    frase: "Aún no tiene compras para calcular",
    clases: "bg-seg-low-soft text-seg-low",
    color: "var(--color-seg-low)",
  },
};

export const nivelRiesgo = (prob) => {
  if (prob == null) return "ninguno";
  if (prob >= UMBRAL_ALTO) return "alto";
  if (prob >= UMBRAL_MEDIO) return "medio";
  return "bajo";
};

export const EXPLICACION_RIESGO =
  "Probabilidad de que el cliente no vuelva a comprar en los próximos 3 meses, calculada con su historial de compras.";

export const mensajeWhatsApp = (nombre, tienda) =>
  `Hola ${nombre}, le saludamos de ${tienda || "la tienda"}. Hace rato no le vemos por aquí. ` +
  "Tenemos productos y ofertas para usted, ¡le esperamos!";
