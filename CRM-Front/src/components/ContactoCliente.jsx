import { MessageCircle, Phone } from "lucide-react";
import { enlaceLlamada, enlaceWhatsApp, primerNombre } from "../lib/formato.js";
import { mensajeWhatsApp } from "../lib/significados.js";
import { useSesion } from "../stores/sesion.js";

/** Botones para escribir por WhatsApp o llamar al cliente. */
export function ContactoCliente({ cliente, compacto = false }) {
  const tienda = useSesion((s) => s.usuario?.usuario);
  const wa = enlaceWhatsApp(cliente.telefono, mensajeWhatsApp(primerNombre(cliente.nombre), tienda));
  const tel = enlaceLlamada(cliente.telefono);
  if (!wa && !tel) return <span className="text-sm text-ink-faint">Sin teléfono</span>;
  const clase = compacto
    ? "grid size-11 place-items-center rounded-control"
    : "inline-flex min-h-11 items-center gap-2 rounded-control px-4 font-medium";
  return (
    <div className="flex gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className={`${clase} bg-risk-low text-white hover:brightness-95`}
           aria-label={`Escribir por WhatsApp a ${cliente.nombre}`}>
          <MessageCircle className="size-5" aria-hidden />
          {!compacto && "WhatsApp"}
        </a>
      )}
      {tel && (
        <a href={tel} className={`${clase} bg-white/80 text-ink hover:bg-white`} aria-label={`Llamar a ${cliente.nombre}`}>
          <Phone className="size-5" aria-hidden />
          {!compacto && "Llamar"}
        </a>
      )}
    </div>
  );
}
