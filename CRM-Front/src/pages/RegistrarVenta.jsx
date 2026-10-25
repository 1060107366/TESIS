import { useMemo, useState } from "react";
import { CheckCircle2, Search, ShoppingBag, UserPlus, UserRound } from "lucide-react";
import { clientes as api } from "../api/crm.js";
import { useCarga } from "../lib/useCarga.js";
import { haceCuanto } from "../lib/formato.js";
import { Bento, Encabezado, Mosaico } from "../components/ui/Mosaico.jsx";
import { Boton, BotonEnlace } from "../components/ui/Controles.jsx";
import { EtiquetaRiesgo, EtiquetaSegmento } from "../components/ui/Etiquetas.jsx";
import { Cargando, ErrorCaja, Vacio } from "../components/ui/Estados.jsx";
import { FormularioCliente } from "../components/FormularioCliente.jsx";
import { FormularioCompra } from "../components/FormularioCompra.jsx";

const normalizar = (t) => String(t || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function RegistrarVenta() {
  const lista = useCarga(() => api.listar());
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [nuevo, setNuevo] = useState(false);

  const sugeridos = useMemo(() => {
    const q = normalizar(texto);
    const todos = lista.datos ?? [];
    if (!q) return [...todos].sort((a, b) => String(b.ultima_compra || "").localeCompare(String(a.ultima_compra || ""))).slice(0, 8);
    return todos.filter((c) => normalizar(c.nombre).includes(q) || String(c.telefono || "").includes(q)).slice(0, 12);
  }, [lista.datos, texto]);

  const reiniciar = () => {
    setElegido(null);
    setResultado(null);
    setTexto("");
    lista.recargar({ silencioso: true });
  };

  if (resultado) {
    return (
      <>
        <Encabezado titulo="Venta registrada" />
        <Bento>
          <Mosaico className="sm:col-span-2" cuerpoClassName="items-start gap-4">
            <CheckCircle2 className="size-12 text-primary" aria-hidden />
            <div>
              <p className="text-lg font-semibold">{resultado.nombre} ya tiene {resultado.total_compras} {resultado.total_compras === 1 ? "compra" : "compras"} registradas.</p>
              <p className="mt-1 text-ink-soft">El sistema actualizó su tipo de cliente y su riesgo de no volver:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <EtiquetaSegmento id={resultado.segmento_id} />
              <EtiquetaRiesgo probabilidad={resultado.probabilidad_churn} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Boton icono={ShoppingBag} onClick={reiniciar}>Registrar otra venta</Boton>
              <BotonEnlace a={`/clientes/${resultado.id}`} variante="secundario">Ver cliente</BotonEnlace>
            </div>
          </Mosaico>
        </Bento>
      </>
    );
  }

  return (
    <>
      <Encabezado titulo="Registrar venta" descripcion="Elija al cliente y escriba cuánto compró." />
      <Bento>
        <Mosaico className="sm:col-span-2" titulo={elegido ? "Cliente" : "¿Quién compró?"}
                 acciones={!elegido && <Boton variante="suave" tamano="pequeno" icono={UserPlus} onClick={() => setNuevo(true)}>Cliente nuevo</Boton>}>
          {elegido ? (
            <div className="flex items-center justify-between gap-3 rounded-control bg-white/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{elegido.nombre}</p>
                <p className="text-sm text-ink-soft">Última compra: {haceCuanto(elegido.ultima_compra).toLowerCase()}</p>
              </div>
              <Boton variante="secundario" tamano="pequeno" onClick={() => setElegido(null)}>Cambiar</Boton>
            </div>
          ) : (
            <>
              <label className="relative mb-3 block">
                <span className="sr-only">Buscar cliente</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
                <input type="search" autoFocus value={texto} onChange={(e) => setTexto(e.target.value)}
                       placeholder="Escriba el nombre o el celular"
                       className="min-h-14 w-full rounded-control border border-white/80 bg-white/75 pl-12 pr-4 text-lg focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25" />
              </label>
              {lista.cargando ? <Cargando /> : lista.error ? <ErrorCaja error={lista.error} onReintentar={lista.recargar} /> :
                sugeridos.length === 0 ? (
                  <Vacio icono={UserRound} titulo="No encontramos ese cliente"
                         accion={<Boton icono={UserPlus} onClick={() => setNuevo(true)}>Registrarlo como nuevo</Boton>} />
                ) : (
                  <>
                    {!texto && <p className="mb-2 text-sm text-ink-soft">Clientes que compraron hace poco</p>}
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {sugeridos.map((c) => (
                        <li key={c.id}>
                          <button onClick={() => setElegido(c)}
                                  className="flex min-h-14 w-full flex-col items-start rounded-control bg-white/60 px-4 py-2 text-left hover:bg-white/90">
                            <span className="font-medium">{c.nombre}</span>
                            <span className="text-sm text-ink-faint">{c.telefono}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </>
          )}
        </Mosaico>

        <Mosaico className="sm:col-span-2" titulo="Valor de la venta">
          {elegido ? (
            <FormularioCompra cliente={elegido} botonGrande onRegistrada={setResultado} />
          ) : (
            <Vacio icono={ShoppingBag} titulo="Primero elija al cliente" texto="Búsquelo en la lista o regístrelo como cliente nuevo." />
          )}
        </Mosaico>
      </Bento>

      <FormularioCliente abierta={nuevo} onCerrar={() => setNuevo(false)}
                         onGuardado={(r) => (r?.total_compras > 0 ? setResultado({ ...r, id: r.cliente_id }) : setElegido({ ...r, id: r.cliente_id }))} />
    </>
  );
}
