import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carga datos del backend y expone { datos, error, cargando, recargar }.
 * `funcion` debe devolver una promesa; `dependencias` controla cuándo recargar.
 */
export function useCarga(funcion, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const vigente = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(funcion, dependencias);

  const recargar = useCallback(async ({ silencioso = false } = {}) => {
    const turno = ++vigente.current;
    if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await cargar();
      if (turno === vigente.current) setEstado({ datos, error: null, cargando: false });
    } catch (error) {
      if (turno === vigente.current) setEstado((e) => ({ ...e, error, cargando: false }));
    }
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}
