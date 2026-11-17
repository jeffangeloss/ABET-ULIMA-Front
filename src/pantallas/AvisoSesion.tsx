import { Mensaje } from "../componentes/Mensaje";

/** Aviso opcional sobre el formulario de ingreso. */
export function AvisoSesion({ texto }: { texto?: string }) {
  return texto ? <Mensaje tipo="aviso">{texto}</Mensaje> : null;
}
