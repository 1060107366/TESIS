import { Link } from "react-router-dom";
import { BellRing, CalendarClock, ShoppingBag, UserPlus, Users } from "lucide-react";
import { clientes as apiClientes, riesgo, tendencias } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { cop, fechaYHora, haceCuanto, num } from "../lib/formato.js";
import { NIVELES, SEGMENTOS, UMBRAL_MEDIO, nivelRiesgo } from "../lib/significados.js";
import { useSesion } from "../stores/sesion.js";
import { Bento, Cifra, Mosaico } from "../components/ui/Mosaico.jsx";
import { BotonEnlace } from "../components/ui/Controles.jsx";
import { EtiquetaRiesgo, EtiquetaSegmento } from "../components/ui/Etiquetas.jsx";
import { Cargando, ErrorCaja, Vacio } from "../components/ui/Estados.jsx";
import { BarrasConteo, BarrasPorMes } from "../components/Graficos.jsx";
import { ContactoCliente } from "../components/ContactoCliente.jsx";

const MAX_LLAMAR = 5;

// A quién llamar primero: clientes valiosos (alto y medio valor) con riesgo de no volver
function prioridadLlamadas(lista) {
  const enRiesgo = lista.filter((c) => c.probabilidad_churn != null && c.probabilidad_churn >= UMBRAL_MEDIO);
  const valiosos = enRiesgo
    .filter((c) => c.segmento_id === 3 || c.segmento_id === 2)
    .sort((a, b) => b.segmento_id - a.segmento_id || b.valor_cliente - a.valor_cliente);
  const resto = enRiesgo.filter((c) => !valiosos.includes(c)).sort((a, b) => b.valor_cliente - a.valor_cliente);
  return [...valiosos, ...resto].slice(0, MAX_LLAMAR);
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function Inicio() {
  const tienda = useSesion((s) => s.usuario?.usuario);
  const lista = useCarga(() => apiClientes.listar());
  const ventas = useCarga(() => tendencias.ventasPorMes());
  const mesAnterior = useCarga(() => tendencias.ventasMesAnterior());
  const porSegmento = useCarga(() => tendencias.clientesPorSegmento());
  const actividad = useCarga(() => apiClientes.actividadReciente());

  const prioridad = prioridadLlamadas(lista.datos ?? []);
  const ids = prioridad.map((c) => c.id).join(",");
  const razones = useCarga(async () => {
    if (!ids) return {};
    const r = await Promise.all(prioridad.map((c) => riesgo.deCliente(c.id).catch(() => null)));
    return Object.fromEntries(prioridad.map((c, i) => [c.id, r[i]?.razones?.[0]]));
  }, [ids]);

  const conteoRiesgo = (lista.datos ?? []).reduce((acc, c) => {
    const n = nivelRiesgo(c.probabilidad_churn);
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const esteMes = ventas.datos?.at(-1);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{saludo()}{tienda ? `, ${tienda}` : ""}</h1>
        <p className="mt-1 text-ink-soft">Esto es lo más importante de su tienda hoy.</p>
      </div>

      <Bento>
        {/* Pieza principal: a quién llamar hoy */}
        <Mosaico className="sm:col-span-2 lg:row-span-3" titulo="Llame hoy a estos clientes"
                 ayuda="Son clientes valiosos que están dejando de venir. Un mensaje a tiempo puede traerlos de vuelta."
                 acciones={<BellRing className="size-6 text-risk-mid" aria-hidden />}>
          {lista.cargando ? <Cargando lineas={5} /> : lista.error ? <ErrorCaja error={lista.error} onReintentar={lista.recargar} /> :
            prioridad.length === 0 ? (
              <Vacio icono={Users} titulo="Nadie en riesgo por ahora"
                     texto="Cuando un cliente valioso deje de venir, aparecerá aquí para que lo contacte." />
            ) : (
              <ul className="-mx-2 divide-y divide-white/70">
                {prioridad.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 px-2 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <Link to={`/clientes/${c.id}`} className="font-semibold text-ink underline-offset-4 hover:underline">{c.nombre}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <EtiquetaSegmento id={c.segmento_id} />
                        <EtiquetaRiesgo probabilidad={c.probabilidad_churn} />
                      </div>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {razones.datos?.[c.id] || `Última compra: ${haceCuanto(c.ultima_compra).toLowerCase()}`}
                      </p>
                    </div>
                    <ContactoCliente cliente={c} />
                  </li>
                ))}
              </ul>
            )}
          {prioridad.length > 0 && (
            <Link to="/clientes?riesgo=alto" className="mt-auto pt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ver todos los clientes en riesgo
            </Link>
          )}
        </Mosaico>

        <Mosaico titulo="Ventas del mes pasado">
          {mesAnterior.cargando ? <Cargando lineas={2} /> : mesAnterior.error ? <ErrorCaja error={mesAnterior.error} /> : (
            <Cifra valor={cop(mesAnterior.datos.total_ingresos)} texto={mesAnterior.datos.mes}
                   detalle={esteMes ? `Este mes va en ${cop(esteMes.value)}` : null} />
          )}
        </Mosaico>

        <Mosaico titulo="Sus clientes">
          {lista.cargando ? <Cargando lineas={2} /> : (
            <Cifra valor={num(lista.datos?.length ?? 0)} texto="clientes registrados"
                   detalle={`${num(conteoRiesgo.alto || 0)} con riesgo alto de no volver`} />
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" cuerpoClassName="justify-center">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">¿Vendió algo?</h2>
              <p className="mt-1 text-sm text-ink-soft">Anótelo para que el sistema conozca mejor a sus clientes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotonEnlace a="/vender" tamano="grande" icono={ShoppingBag}>Registrar venta</BotonEnlace>
              <BotonEnlace a="/clientes?nuevo=1" variante="secundario" tamano="grande" icono={UserPlus}>Nuevo cliente</BotonEnlace>
            </div>
          </div>
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="¿Volverán sus clientes?"
                 ayuda="Probabilidad de que vuelvan a comprar en los próximos 3 meses.">
          {lista.cargando ? <Cargando /> : (
            <BarrasConteo filas={["alto", "medio", "bajo", "ninguno"].map((n) => ({
              nombre: NIVELES[n].nombre === "Sin compras" ? "Sin compras todavía" : `${NIVELES[n].nombre}: ${NIVELES[n].frase.toLowerCase()}`,
              valor: conteoRiesgo[n] || 0,
              color: NIVELES[n].color,
            }))} />
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2 lg:col-span-3" titulo="Ventas de los últimos 12 meses"
                 ayuda="La barra más oscura es el mes actual.">
          {ventas.cargando ? <Cargando lineas={4} /> : ventas.error ? <ErrorCaja error={ventas.error} onReintentar={ventas.recargar} /> : (
            <BarrasPorMes datos={ventas.datos} dinero />
          )}
        </Mosaico>

        <Mosaico titulo="Tipos de cliente" ayuda="Según cuánto y qué tan seguido compran.">
          {porSegmento.cargando ? <Cargando /> : porSegmento.error ? <ErrorCaja error={porSegmento.error} /> :
            porSegmento.datos.length === 0 ? <Vacio titulo="Aún sin clientes" /> : (
              <BarrasConteo filas={porSegmento.datos
                .slice().sort((a, b) => (b.segmento_id % 4) - (a.segmento_id % 4))
                .map((s) => ({ nombre: s.name, valor: s.value, color: SEGMENTOS[s.segmento_id]?.color }))} />
            )}
          <Link to="/mi-tienda" className="mt-auto pt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
            Qué significa cada tipo
          </Link>
        </Mosaico>

        <Mosaico className="sm:col-span-2 lg:col-span-4" titulo="Lo último que pasó" ayuda="Movimientos de los últimos 7 días.">
          {actividad.cargando ? <Cargando lineas={4} /> : actividad.error ? <ErrorCaja error={actividad.error} /> :
            actividad.datos.length === 0 ? (
              <Vacio icono={CalendarClock} titulo="Sin movimientos esta semana" texto="Las ventas y los clientes nuevos aparecerán aquí." />
            ) : (
              <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {actividad.datos.slice(0, 8).map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.cliente}</p>
                      <p className="text-sm text-ink-soft">
                        {a.accion}{a.descripcion?.monto ? `: ${cop(a.descripcion.monto)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-ink-faint">{fechaYHora(a.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Mosaico>

      </Bento>
    </>
  );
}
