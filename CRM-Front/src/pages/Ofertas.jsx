import { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Sparkles } from "lucide-react";
import { clientes, ofertas } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { num, porcentaje } from "../lib/formato.js";
import { segmento } from "../lib/significados.js";
import { avisar } from "../stores/sesion.js";
import { Bento, Encabezado, Mosaico } from "../components/ui/Mosaico.jsx";
import { Boton } from "../components/ui/Controles.jsx";
import { Cargando, ErrorCaja, Vacio } from "../components/ui/Estados.jsx";

// Mismas reglas que aplica el backend (recommendation_service.py)
const califica = (c, oferta) => {
  const r = oferta.reglas || {};
  return c.segmento_id === oferta.segmento_id &&
    (c.frecuencia_compra || 0) >= (r.min_frecuencia_compra ?? 0) &&
    (c.probabilidad_churn ?? 0) <= (r.max_probabilidad_churn ?? 1);
};

function regla(oferta) {
  const r = oferta.reglas || {};
  const max = r.max_probabilidad_churn ?? 1;
  return max >= 1 ? "Para todos los clientes de este tipo." : `Para los que tienen un riesgo de no volver menor al ${porcentaje(max)}.`;
}

export default function Ofertas() {
  const catalogo = useCarga(() => ofertas.catalogo());
  const lista = useCarga(() => clientes.listar());
  const [preparando, setPreparando] = useState(false);

  const prepararTodas = async () => {
    setPreparando(true);
    try {
      const r = await ofertas.prepararTodas();
      avisar(`Ofertas listas para ${num(r.exitosos)} clientes.`);
    } catch (err) {
      avisar(err.message, "error");
    } finally {
      setPreparando(false);
    }
  };

  const orden = { 3: 0, 2: 1, 1: 2, 4: 3 };

  return (
    <>
      <Encabezado titulo="Ofertas"
                  descripcion="Descuentos sugeridos para cada tipo de cliente. Cada cliente ve las suyas en su ficha."
                  acciones={<Boton icono={Sparkles} cargando={preparando} onClick={prepararTodas}>Preparar ofertas para todos</Boton>} />
      {catalogo.cargando ? <div className="glass rounded-tile p-6"><Cargando lineas={5} /></div> :
        catalogo.error ? <ErrorCaja error={catalogo.error} onReintentar={catalogo.recargar} /> :
          catalogo.datos.length === 0 ? (
            <div className="glass rounded-tile p-6">
              <Vacio icono={Gift} titulo="No hay ofertas configuradas" texto="Ejecute python seed.py en el backend para crear las ofertas base." />
            </div>
          ) : (
            <Bento columnas={2}>
              {[...catalogo.datos].sort((a, b) => (orden[a.segmento_id] ?? 9) - (orden[b.segmento_id] ?? 9)).map((o) => {
                const s = segmento(o.segmento_id);
                const n = (lista.datos ?? []).filter((c) => califica(c, o)).length;
                return (
                  <Mosaico key={o.id} >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-medium" style={{ color: s.color }}>{s.nombre}</span>
                        <h2 className="mt-1 text-lg font-semibold">{o.tipo_recomendacion}</h2>
                        <p className="mt-1 text-sm text-ink-soft">{regla(o)}</p>
                      </div>
                      {o.reglas?.descuento > 0 && (
                        <span className="tabular grid size-20 shrink-0 place-items-center rounded-full bg-primary-soft text-center text-xl font-semibold leading-tight text-primary-strong">
                          {o.reglas.descuento}%<span className="block text-xs font-medium">menos</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/70 pt-3">
                      <p className="text-sm text-ink-soft">
                        {lista.cargando ? "Contando clientes…" : <><span className="tabular font-semibold text-ink">{num(n)}</span> {n === 1 ? "cliente califica" : "clientes califican"}</>}
                      </p>
                      <Link to={`/clientes?tipo=${o.segmento_id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">Ver clientes</Link>
                    </div>
                  </Mosaico>
                );
              })}
            </Bento>
          )}
    </>
  );
}
