import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { clientes as api } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { cop, haceCuanto, num } from "../lib/formato.js";
import { NIVELES, SEGMENTOS, nivelRiesgo } from "../lib/significados.js";
import { Encabezado } from "../components/ui/Mosaico.jsx";
import { Boton, Filtro } from "../components/ui/Controles.jsx";
import { EtiquetaRiesgo, EtiquetaSegmento } from "../components/ui/Etiquetas.jsx";
import { Cargando, ErrorCaja, Vacio } from "../components/ui/Estados.jsx";
import { FormularioCliente } from "../components/FormularioCliente.jsx";
import { ContactoCliente } from "../components/ContactoCliente.jsx";

const POR_PAGINA = 40;
const ORDENES = {
  riesgo: { texto: "Más riesgo primero", fn: (a, b) => (b.probabilidad_churn ?? -1) - (a.probabilidad_churn ?? -1) },
  valor: { texto: "Más valiosos primero", fn: (a, b) => b.valor_cliente - a.valor_cliente },
  reciente: { texto: "Compra más reciente", fn: (a, b) => String(b.ultima_compra || "").localeCompare(String(a.ultima_compra || "")) },
  nombre: { texto: "Nombre (A-Z)", fn: (a, b) => a.nombre.localeCompare(b.nombre, "es") },
};

const normalizar = (t) => String(t || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Clientes() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const { datos, error, cargando, recargar } = useCarga(() => api.listar());
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState("riesgo");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const segmentoFiltro = params.get("tipo") ? Number(params.get("tipo")) : null;
  const riesgoFiltro = params.get("riesgo");
  const formularioAbierto = params.get("nuevo") === "1";

  const cambiarFiltro = (clave, valor) => {
    const p = new URLSearchParams(params);
    if (valor == null || p.get(clave) === String(valor)) p.delete(clave);
    else p.set(clave, valor);
    setParams(p, { replace: true });
    setMostrar(POR_PAGINA);
  };

  const lista = useMemo(() => {
    const q = normalizar(texto);
    return (datos ?? [])
      .filter((c) => !q || normalizar(c.nombre).includes(q) || String(c.telefono || "").includes(q) || normalizar(c.email).includes(q))
      .filter((c) => segmentoFiltro == null || c.segmento_id === segmentoFiltro)
      .filter((c) => !riesgoFiltro || nivelRiesgo(c.probabilidad_churn) === riesgoFiltro)
      .sort(ORDENES[orden].fn);
  }, [datos, texto, segmentoFiltro, riesgoFiltro, orden]);

  const conteo = (fn) => (datos ?? []).filter(fn).length;

  return (
    <>
      <Encabezado titulo="Clientes"
                  descripcion="Busque a un cliente, mire su riesgo de no volver y contáctelo."
                  acciones={<Boton icono={UserPlus} onClick={() => cambiarFiltro("nuevo", 1)}>Nuevo cliente</Boton>} />

      <div className="glass mb-4 space-y-4 rounded-tile p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar cliente</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input type="search" value={texto} onChange={(e) => { setTexto(e.target.value); setMostrar(POR_PAGINA); }}
                   placeholder="Buscar por nombre, celular o correo"
                   className="min-h-12 w-full rounded-control border border-white/80 bg-white/75 pl-12 pr-4 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25" />
          </label>
          <label className="sm:w-60">
            <span className="sr-only">Ordenar</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value)}
                    className="min-h-12 w-full rounded-control border border-white/80 bg-white/75 px-4 focus:border-primary focus:outline-none">
              {Object.entries(ORDENES).map(([k, o]) => <option key={k} value={k}>{o.texto}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de cliente">
          {[3, 2, 1, 4].map((id) => (
            <Filtro key={id} activo={segmentoFiltro === id} onClick={() => cambiarFiltro("tipo", id)}
                    conteo={conteo((c) => c.segmento_id === id)}>{SEGMENTOS[id].nombre}</Filtro>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por riesgo">
          {["alto", "medio", "bajo"].map((n) => (
            <Filtro key={n} activo={riesgoFiltro === n} onClick={() => cambiarFiltro("riesgo", n)}
                    conteo={conteo((c) => nivelRiesgo(c.probabilidad_churn) === n)}>{NIVELES[n].nombre}</Filtro>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="glass rounded-tile p-6"><Cargando lineas={6} /></div>
      ) : error ? (
        <ErrorCaja error={error} onReintentar={recargar} />
      ) : lista.length === 0 ? (
        <div className="glass rounded-tile p-6">
          {datos.length === 0 ? (
            <Vacio icono={Users} titulo="Todavía no tiene clientes" texto="Registre su primer cliente para empezar."
                   accion={<Boton icono={UserPlus} onClick={() => cambiarFiltro("nuevo", 1)}>Nuevo cliente</Boton>} />
          ) : (
            <Vacio icono={Search} titulo="Ningún cliente coincide" texto="Pruebe con otro nombre o quite los filtros." />
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 px-1 text-sm text-ink-soft">{num(lista.length)} {lista.length === 1 ? "cliente" : "clientes"}</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {lista.slice(0, mostrar).map((c) => (
              <li key={c.id} className="glass flex flex-col gap-3 rounded-tile p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/clientes/${c.id}`} className="group min-w-0">
                    <p className="truncate text-lg font-semibold group-hover:underline group-hover:underline-offset-4">{c.nombre}</p>
                    <p className="text-sm text-ink-soft">Última compra: {haceCuanto(c.ultima_compra).toLowerCase()}</p>
                    {c.total_compras > 0 && (
                      <p className="text-sm text-ink-soft">
                        {num(c.total_compras)} {c.total_compras === 1 ? "compra" : "compras"}, en promedio {cop(c.valor_medio_orden)}
                      </p>
                    )}
                  </Link>
                  <ContactoCliente cliente={c} compacto />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EtiquetaSegmento id={c.segmento_id} />
                  <EtiquetaRiesgo probabilidad={c.probabilidad_churn} />
                  <Link to={`/clientes/${c.id}`} className="ml-auto inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary">
                    Ver cliente <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {mostrar < lista.length && (
            <div className="mt-4 flex justify-center">
              <Boton variante="secundario" onClick={() => setMostrar(mostrar + POR_PAGINA)}>
                Mostrar más ({num(lista.length - mostrar)} restantes)
              </Boton>
            </div>
          )}
        </>
      )}

      <FormularioCliente abierta={formularioAbierto} onCerrar={() => cambiarFiltro("nuevo", null)}
                         onGuardado={(r) => (r?.cliente_id ? navegar(`/clientes/${r.cliente_id}`) : recargar())} />
    </>
  );
}
