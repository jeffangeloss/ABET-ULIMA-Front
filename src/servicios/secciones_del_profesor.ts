// P2 del profesor (US-59 de la spec 007 del Back, J-45). Combina la ruta 4 con una sola petición a la ruta 8 sin
// seccion_id, sin cambiar ninguna de las dos (contrato, secciones 5 y 7). Desde la spec 008 las dos llevan el periodo
// elegido en la cabecera, o ninguno si la ruta 18 falla (contrato, sección 15.4).
import { listarCargas, listarSecciones } from "./api";
import type { CargaResumida, Seccion } from "./tipos";

export interface SeccionesDelProfesor {
  secciones: Seccion[];
  /** Por seccion_id, la primera carga RECHAZADA de la sección en el orden de la ruta 8, la más reciente. */
  rechazadas: ReadonlyMap<number, number>;
}

/**
 * Pide la ruta 4 y, si trae alguna sección, la ruta 8. Una falla de la ruta 8 deja P2 como si no hubiera cargas
 * rechazadas, sin mensaje (FR-002 de la spec 007). Una falla de la ruta 4 llega a la pantalla como hoy.
 */
export async function seccionesDelProfesor(periodo?: string): Promise<SeccionesDelProfesor> {
  const secciones = await listarSecciones(periodo);
  const rechazadas = new Map<number, number>();
  if (secciones.length === 0) return { secciones, rechazadas };
  // Spec 008, US-73. La marca de la última carga rechazada sale del periodo elegido, el mismo de la ruta 4.
  const cargas = await listarCargas(undefined, periodo).catch((): CargaResumida[] => []);
  for (const c of cargas) {
    if (c.estado === "RECHAZADA" && !rechazadas.has(c.seccion.seccion_id)) rechazadas.set(c.seccion.seccion_id, c.carga_id);
  }
  return { secciones, rechazadas };
}
