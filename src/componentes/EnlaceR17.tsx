import type { ReactNode } from "react";
import { ErrorApi, urlR17 } from "../servicios/api";

/**
 * Enlace de descarga del R-17 de una carga. Si el carga_id de la respuesta no es un entero positivo, urlR17 lanza
 * ErrorApi y el enlace no aparece, para que el resto de la pantalla siga sin una ruta fuera de /api/cargas/.
 */
export function EnlaceR17({ cargaId, className, children }: { cargaId: number | null; className: string; children: ReactNode }) {
  let ruta: string;
  try {
    ruta = urlR17(cargaId as number);
  } catch (e) {
    if (e instanceof ErrorApi) return null;
    throw e;
  }
  return (
    <a className={className} href={ruta}>
      {children}
    </a>
  );
}
