// Mosaico de vidrio: la pieza básica de la rejilla bento.
// Use `className` para el tamaño en la rejilla, p. ej. "lg:col-span-2 lg:row-span-2".

export function Bento({ columnas = 4, className = "", children }) {
  return <div className={`${columnas === 2 ? "bento-2" : "bento"} ${className}`}>{children}</div>;
}

export function Mosaico({ titulo, ayuda, acciones, className = "", cuerpoClassName = "", children, as: Etiqueta = "section" }) {
  return (
    <Etiqueta className={`glass flex min-w-0 flex-col rounded-tile p-5 sm:p-6 ${className}`}>
      {(titulo || acciones) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-lg font-semibold leading-snug text-ink">{titulo}</h2>}
            {ayuda && <p className="mt-1 text-sm text-ink-soft">{ayuda}</p>}
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${cuerpoClassName}`}>{children}</div>
    </Etiqueta>
  );
}

// Cifra destacada con su explicación
export function Cifra({ valor, texto, detalle, tono = "text-ink" }) {
  return (
    <div>
      <p className={`tabular text-[clamp(1.6rem,2.4vw,2.125rem)] font-semibold leading-none ${tono}`}>{valor}</p>
      {texto && <p className="mt-2 text-sm text-ink-soft">{texto}</p>}
      {detalle && <p className="mt-1 text-xs text-ink-faint">{detalle}</p>}
    </div>
  );
}

export function Encabezado({ titulo, descripcion, acciones }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold leading-tight text-ink sm:text-2xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-ink-soft">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
