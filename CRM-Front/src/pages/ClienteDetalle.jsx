import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Gift, Pencil, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { clientes, ofertas, riesgo, segmentos, tendencias } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { cop, fecha, fechaYHora, haceCuanto, num } from "../lib/formato.js";
import { EXPLICACION_RIESGO, segmento } from "../lib/significados.js";
import { avisar } from "../stores/sesion.js";
import { Bento, Mosaico } from "../components/ui/Mosaico.jsx";
import { Boton } from "../components/ui/Controles.jsx";
import { EtiquetaRiesgo, EtiquetaSegmento, MedidorRiesgo } from "../components/ui/Etiquetas.jsx";
import { Cargando, ErrorCaja, Vacio, Ventana } from "../components/ui/Estados.jsx";
import { BarrasPorMes } from "../components/Graficos.jsx";
import { ContactoCliente } from "../components/ContactoCliente.jsx";
import { FormularioCliente } from "../components/FormularioCliente.jsx";
import { FormularioCompra } from "../components/FormularioCompra.jsx";

const TIPOS = { 1: "Cliente registrado", 2: "Compra", 3: "Datos actualizados", 4: "Cliente eliminado" };
const ultimo = (lista) => (lista?.length ? lista[lista.length - 1].valor : null);

export default function ClienteDetalle() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [version, setVersion] = useState(0);   // sube después de cada cambio para recargar todo
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [preparando, setPreparando] = useState(false);

  const cliente = useCarga(() => clientes.obtener(id), [id, version]);
  const prediccion = useCarga(() => riesgo.deCliente(id), [id, version]);
  const tipo = useCarga(() => segmentos.deCliente(id), [id, version]);
  const historial = useCarga(() => clientes.interacciones(id), [id, version]);
  const susOfertas = useCarga(() => ofertas.deCliente(id), [id, version]);
  const ticket = useCarga(() => tendencias.ticketCliente(id), [id, version]);
  const frecuencia = useCarga(() => tendencias.frecuenciaCliente(id), [id, version]);
  const metricas = useCarga(() => clientes.metricas(id), [id, version]);

  const recargarTodo = () => setVersion((v) => v + 1);

  if (cliente.error) {
    return (
      <div className="glass rounded-tile p-6">
        <ErrorCaja error={cliente.error} />
        <Link to="/clientes" className="mt-4 inline-block font-medium text-primary">Volver a clientes</Link>
      </div>
    );
  }
  if (cliente.cargando && !cliente.datos) return <div className="glass rounded-tile p-6"><Cargando lineas={6} /></div>;

  const c = cliente.datos;
  const compras = (historial.datos ?? []).filter((i) => i.tipo_interaccion_id === 2);
  const valorMensual = ultimo((metricas.datos ?? []).filter((m) => m.tipo_metrica === "valor_cliente"));
  const diasEntreCompras = ultimo(frecuencia.datos);
  const s = segmento(c.segmento_id);

  // Gasto promedio por compra a lo largo del tiempo (una barra por registro de métrica)
  const serieTicket = (ticket.datos ?? []).slice(-12).map((t) => ({ month: fecha(t.fecha), value: t.valor }));

  const eliminar = async () => {
    setBorrando(true);
    try {
      await clientes.eliminar(c.id);
      avisar(`Cliente ${c.nombre} eliminado.`);
      navegar("/clientes", { replace: true });
    } catch (err) {
      avisar(err.message, "error");
      setBorrando(false);
    }
  };

  const prepararOfertas = async () => {
    setPreparando(true);
    try {
      await ofertas.prepararCliente(c.id);
      await susOfertas.recargar({ silencioso: true });
      avisar("Ofertas actualizadas.");
    } catch (err) {
      avisar(err.message, "error");
    } finally {
      setPreparando(false);
    }
  };

  return (
    <>
      <Link to="/clientes" className="mb-4 inline-flex min-h-10 items-center gap-2 font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-5" aria-hidden /> Clientes
      </Link>

      <div className="glass mb-5 flex flex-col gap-4 rounded-tile p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{c.nombre}</h1>
          <p className="mt-1 text-ink-soft">{c.telefono || "Sin teléfono"}<span className="mx-2 text-ink-faint">|</span>{c.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <EtiquetaSegmento id={c.segmento_id} />
            <EtiquetaRiesgo probabilidad={c.probabilidad_churn} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ContactoCliente cliente={c} />
          <Boton variante="secundario" icono={Pencil} onClick={() => setEditar(true)}>Editar</Boton>
          <Boton variante="fantasma" icono={Trash2} onClick={() => setBorrar(true)} aria-label="Eliminar cliente">Eliminar</Boton>
        </div>
      </div>

      <Bento>
        <Mosaico className="sm:col-span-2" titulo="Registrar una venta" acciones={<ShoppingBag className="size-6 text-primary" aria-hidden />}>
          <FormularioCompra cliente={c} onRegistrada={recargarTodo} />
        </Mosaico>

        <Mosaico className="sm:col-span-2 lg:col-span-1 lg:row-span-2" titulo="¿Volverá a comprar?" ayuda={EXPLICACION_RIESGO}>
          {prediccion.cargando ? <Cargando /> : prediccion.error ? <ErrorCaja error={prediccion.error} /> : (
            <>
              <MedidorRiesgo probabilidad={prediccion.datos.probabilidad} />
              {prediccion.datos.razones?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Por qué</h3>
                  <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                    {prediccion.datos.razones.map((r) => (
                      <li key={r} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden />{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Mosaico>

        <Mosaico className="lg:row-span-2" titulo="Tipo de cliente">
          {tipo.cargando ? <Cargando /> : tipo.error ? <ErrorCaja error={tipo.error} /> : (
            <>
              <p className="font-semibold" style={{ color: s.color }}>{s.nombre}</p>
              {tipo.datos.perfil && tipo.datos.perfil !== s.nombre && (
                <p className="text-sm text-ink-soft">Grupo: {tipo.datos.perfil.split("·").pop().trim()}</p>
              )}
              <p className="mt-1 text-sm text-ink-soft">{s.explicacion}</p>
              {tipo.datos.rfm && (
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-control bg-white/60 p-2">
                    <dt className="text-xs text-ink-faint">Días sin comprar</dt>
                    <dd className="tabular text-lg font-semibold">{num(Math.round(tipo.datos.rfm.recencia_dias))}</dd>
                  </div>
                  <div className="rounded-control bg-white/60 p-2">
                    <dt className="text-xs text-ink-faint">Compras en el año</dt>
                    <dd className="tabular text-lg font-semibold">{num(tipo.datos.rfm.compras_ultimo_anio)}</dd>
                  </div>
                  <div className="rounded-control bg-white/60 p-2">
                    <dt className="text-xs text-ink-faint">Gasta vs. típico</dt>
                    <dd className="tabular text-lg font-semibold">{num(tipo.datos.rfm.gasto_vs_tipico)}×</dd>
                  </div>
                </dl>
              )}
            </>
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="Sus compras">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div><dt className="text-sm text-ink-soft">Última compra</dt><dd className="font-semibold">{haceCuanto(c.ultima_compra)}</dd></div>
            <div><dt className="text-sm text-ink-soft">Compras registradas</dt><dd className="tabular font-semibold">{num(c.total_compras)}</dd></div>
            <div><dt className="text-sm text-ink-soft">Gasto promedio por compra</dt><dd className="tabular font-semibold">{cop(c.valor_medio_orden)}</dd></div>
            {diasEntreCompras > 0 && (
              <div><dt className="text-sm text-ink-soft">Compra en promedio cada</dt><dd className="tabular font-semibold">{num(Math.round(diasEntreCompras))} días</dd></div>
            )}
            {valorMensual != null && (
              <div><dt className="text-sm text-ink-soft">Le compra al mes, en promedio</dt><dd className="tabular font-semibold">{cop(valorMensual)}</dd></div>
            )}
          </dl>
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="Historial" ayuda="Lo más reciente primero.">
          {historial.cargando ? <Cargando lineas={4} /> : historial.error ? <ErrorCaja error={historial.error} /> :
            historial.datos.length === 0 ? <Vacio titulo="Sin movimientos" /> : (
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {historial.datos.slice(0, 50).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-control px-2 py-2 even:bg-white/40">
                    <div>
                      <p className="font-medium">{TIPOS[i.tipo_interaccion_id] || "Movimiento"}</p>
                      <p className="text-sm text-ink-faint">{fechaYHora(i.data_interaccion?.fecha_compra || i.fecha_creacion)}</p>
                    </div>
                    {i.data_interaccion?.monto != null && <span className="tabular font-semibold">{cop(i.data_interaccion.monto)}</span>}
                  </li>
                ))}
              </ul>
            )}
          {compras.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              Total comprado: <span className="tabular font-semibold text-ink">{cop(compras.reduce((t, i) => t + Number(i.data_interaccion?.monto || 0), 0))}</span>
            </p>
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="Ofertas para este cliente"
                 ayuda="Sugeridas según su tipo de cliente y su riesgo de no volver."
                 acciones={<Boton variante="secundario" tamano="pequeno" icono={RefreshCw} cargando={preparando} onClick={prepararOfertas}>Actualizar</Boton>}>
          {susOfertas.cargando ? <Cargando /> : susOfertas.error ? <ErrorCaja error={susOfertas.error} /> :
            susOfertas.datos.length === 0 ? (
              <Vacio icono={Gift} titulo="Sin ofertas por ahora" texto="Toque Actualizar después de registrar compras." />
            ) : (
              <ul className="space-y-2">
                {susOfertas.datos.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 rounded-control bg-white/60 px-4 py-3">
                    <span className="flex items-center gap-2 font-medium"><Gift className="size-5 text-maize" aria-hidden />{o.tipo_recomendacion}</span>
                    {o.descuento > 0 && <span className="tabular rounded-chip bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-strong">{o.descuento}% de descuento</span>}
                  </li>
                ))}
              </ul>
            )}
        </Mosaico>

        {serieTicket.length > 1 && (
          <Mosaico className="sm:col-span-2" titulo="Gasto promedio por compra" ayuda="Cómo ha cambiado con el tiempo.">
            <BarrasPorMes datos={serieTicket} dinero alto={200} color="var(--color-sky)" />
          </Mosaico>
        )}
      </Bento>

      <FormularioCliente abierta={editar} onCerrar={() => setEditar(false)} cliente={c} onGuardado={recargarTodo} />
      <Ventana abierta={borrar} onCerrar={() => setBorrar(false)} titulo="¿Eliminar este cliente?">
        <p className="text-ink-soft">Se borrarán {c.nombre} y todo su historial de compras. Esta acción no se puede deshacer.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={() => setBorrar(false)}>Cancelar</Boton>
          <Boton variante="peligro" icono={Trash2} cargando={borrando} onClick={eliminar}>Eliminar cliente</Boton>
        </div>
      </Ventana>
    </>
  );
}
