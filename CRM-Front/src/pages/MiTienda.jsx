import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import { riesgo, segmentos, tendencias } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { cop, fecha, num, porcentaje } from "../lib/formato.js";
import { SEGMENTOS } from "../lib/significados.js";
import { avisar } from "../stores/sesion.js";
import { Bento, Cifra, Encabezado, Mosaico } from "../components/ui/Mosaico.jsx";
import { Boton } from "../components/ui/Controles.jsx";
import { Cargando, ErrorCaja } from "../components/ui/Estados.jsx";
import { BarrasPorMes } from "../components/Graficos.jsx";

// Último valor de cada cliente para una métrica histórica
function ultimoPorCliente(filas) {
  const ultimo = new Map();
  for (const f of filas ?? []) ultimo.set(f.cliente_id, f.valor);
  return [...ultimo.values()].filter((v) => v > 0);
}
const mediana = (xs) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

export default function MiTienda() {
  const [actualizando, setActualizando] = useState(false);
  const [version, setVersion] = useState(0);
  const resumen = useCarga(() => segmentos.resumen(), [version]);
  const modeloSeg = useCarga(() => segmentos.modelo(), []);
  const modeloRiesgo = useCarga(() => riesgo.modelo(), []);
  const monitoreo = useCarga(() => riesgo.monitoreo(), [version]);
  const promedio = useCarga(() => riesgo.promedio(), [version]);
  const actividad = useCarga(() => tendencias.actividadPorMes(), [version]);
  const tickets = useCarga(() => tendencias.ticketClientes(), [version]);
  const frecuencias = useCarga(() => tendencias.frecuenciaClientes(), [version]);

  const actualizar = async () => {
    setActualizando(true);
    try {
      const r = await riesgo.actualizarTodo();
      await segmentos.actualizarTodo();
      avisar(`Análisis actualizado para ${num(r?.clientes ?? 0)} clientes.`);
      setVersion((v) => v + 1);
    } catch (err) {
      avisar(err.message, "error");
    } finally {
      setActualizando(false);
    }
  };

  const ticketTipico = mediana(ultimoPorCliente(tickets.datos));
  const diasTipicos = mediana(ultimoPorCliente(frecuencias.datos));
  const valorPromedio = promedio.datos ? Object.values(promedio.datos)[0] : null;
  const psi = Object.values(monitoreo.datos?.psi ?? {});
  const alertas = psi.filter((p) => p.estado === "reentrenar").length;
  const vigilar = psi.filter((p) => p.estado === "vigilar").length;
  const porSegmento = Object.fromEntries((resumen.datos ?? []).map((s) => [s.segmento_id, s]));
  const subgrupos = (id) => (modeloSeg.datos?.perfiles ?? []).filter((p) => p.segmento_id === id && p.perfil !== p.segmento);

  return (
    <>
      <Encabezado titulo="Cómo va mi tienda"
                  descripcion="Lo que el sistema aprendió de sus clientes y qué tan confiable es."
                  acciones={<Boton icono={RefreshCw} cargando={actualizando} onClick={actualizar}>Actualizar análisis</Boton>} />

      <Bento>
        <Mosaico className="sm:col-span-2 lg:col-span-4" titulo="Sus tipos de cliente"
                 ayuda="El sistema agrupa a sus clientes según qué tan seguido compran, hace cuánto vinieron y cuánto gastan.">
          {resumen.cargando ? <Cargando lineas={4} /> : resumen.error ? <ErrorCaja error={resumen.error} onReintentar={resumen.recargar} /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[3, 2, 1, 4].map((id) => {
                const s = SEGMENTOS[id];
                const datos = porSegmento[id];
                return (
                  <Link key={id} to={`/clientes?tipo=${id}`} className="flex flex-col rounded-control bg-white/55 p-4 hover:bg-white/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold" style={{ color: s.color }}>{datos?.segmento || s.nombre}</span>
                      <span className="tabular text-xl font-semibold">{num(datos?.clientes ?? 0)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{s.explicacion}</p>
                    {datos?.recencia_dias_promedio != null && (
                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between gap-2"><dt className="text-ink-faint">Días sin comprar</dt><dd className="tabular font-medium">{num(Math.round(datos.recencia_dias_promedio))}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-ink-faint">Compras en el año</dt><dd className="tabular font-medium">{num(datos.compras_ultimo_anio_promedio)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-ink-faint">Gasta vs. cliente típico</dt><dd className="tabular font-medium">{num(datos.gasto_vs_tipico_promedio)}×</dd></div>
                      </dl>
                    )}
                    {subgrupos(id).length > 0 && (
                      <p className="mt-3 text-xs text-ink-faint">
                        Incluye {subgrupos(id).length} grupos: {subgrupos(id).map((p) => `«${p.perfil.split("·").pop().trim()}»`).join(" y ")}.
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="Movimiento de la tienda" ayuda="Ventas, clientes nuevos y cambios registrados por mes.">
          {actividad.cargando ? <Cargando lineas={4} /> : actividad.error ? <ErrorCaja error={actividad.error} /> : (
            <BarrasPorMes datos={actividad.datos} unidad="movimientos" color="var(--color-seg-mid)" alto={220} />
          )}
        </Mosaico>

        <Mosaico titulo="Compra típica">
          {tickets.cargando ? <Cargando lineas={2} /> : (
            <Cifra valor={ticketTipico ? cop(ticketTipico) : "—"} texto="es lo que gasta un cliente típico en cada compra"
                   detalle={diasTipicos ? `y vuelve en promedio cada ${num(Math.round(diasTipicos))} días` : null} />
          )}
        </Mosaico>

        <Mosaico titulo="Clientes en riesgo">
          {promedio.cargando ? <Cargando lineas={2} /> : (
            typeof valorPromedio === "number" ? (
              <Cifra valor={porcentaje(valorPromedio)} tono="text-risk-high"
                     texto="es la probabilidad promedio de no volver entre los clientes que están en riesgo" />
            ) : (
              <Cifra valor="Sin riesgo" tono="text-risk-low" texto="Ningún cliente supera el 50 % de probabilidad de no volver." />
            )
          )}
          <Link to="/clientes?riesgo=alto" className="mt-auto pt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">Ver clientes en riesgo</Link>
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="¿Qué tan confiable es el sistema?"
                 acciones={<ShieldCheck className="size-6 text-primary" aria-hidden />}>
          {modeloRiesgo.cargando ? <Cargando /> : modeloRiesgo.error ? <ErrorCaja error={modeloRiesgo.error} /> : (
            <div className="space-y-3 text-ink-soft">
              <p>
                Cuando compara a dos clientes, acierta cuál tiene más riesgo de no volver
                <strong className="tabular text-ink"> {Math.round(modeloRiesgo.datos.roc_auc_test * 100)} de cada 100 veces</strong>.
              </p>
              <p className="text-sm">
                Aprendió de las compras reales de miles de clientes de un comercio y se probó con un negocio distinto.
                Con las ventas que usted registre, se puede ajustar a su tienda.
              </p>
              <p className="text-xs text-ink-faint">
                Modelo de riesgo versión {modeloRiesgo.datos.version}, entrenado el {fecha(modeloRiesgo.datos.fecha_entrenamiento)}.
                {modeloSeg.datos && ` Modelo de tipos de cliente versión ${modeloSeg.datos.version}.`}
              </p>
            </div>
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="¿Sus clientes se parecen a los que conoce el sistema?"
                 acciones={<Activity className="size-6 text-seg-mid" aria-hidden />}>
          {monitoreo.cargando ? <Cargando /> : monitoreo.error ? <ErrorCaja error={monitoreo.error} /> :
            monitoreo.datos.estado === "sin_datos" ? (
              <p className="text-ink-soft">Aún no hay compras suficientes para comparar.</p>
            ) : (
              <div className="space-y-2">
                <p className={`font-semibold ${alertas ? "text-risk-mid" : "text-risk-low"}`}>
                  {alertas ? "Sus clientes se comportan distinto en algunos aspectos" : vigilar ? "Se parecen, con pequeñas diferencias" : "Sí, se parecen"}
                </p>
                <p className="text-sm text-ink-soft">
                  Se revisaron {num(monitoreo.datos.clientes_evaluados)} clientes en {psi.length} aspectos (frecuencia, gasto, tiempo sin comprar…).
                  {alertas > 0 && ` En ${alertas} hay diferencias grandes: conviene ajustar el sistema con los datos de su tienda.`}
                </p>
              </div>
            )}
        </Mosaico>
      </Bento>
    </>
  );
}
