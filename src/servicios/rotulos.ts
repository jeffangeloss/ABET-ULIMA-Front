// Rótulos por cuenta (US-63 de la spec 007 del Back). Los textos del profesor no cambian, porque los citan los
// .feature de las specs 001 y 004, y los del coordinador hablan de la carrera (propuestas).
import type { Usuario } from "./tipos";

/** Botón de la cabecera y título de P2. */
export function rotuloDeSecciones(usuario: Usuario): string {
  return usuario.rol === "COORDINADOR" ? "Secciones de la carrera" : "Mis secciones";
}

/** Enlace a P6, que no se parece a «Ver resultado», el de P4 (spec 004, AD-11). */
export function rotuloDeLogros(usuario: Usuario): string {
  return usuario.rol === "COORDINADOR" ? "Ver los logros por SO de la carrera" : "Ver mis logros por SO";
}

/** Lista vacía de P2, P5 y P6. */
export function sinSecciones(usuario: Usuario): string {
  return usuario.rol === "COORDINADOR" ? "La carrera no tiene secciones en este periodo." : "No tiene secciones asignadas en este periodo.";
}

/** Aviso de espera de P6. */
export function esperaDeLogros(usuario: Usuario): string {
  return usuario.rol === "COORDINADOR" ? "Cargando los logros de la carrera…" : "Cargando sus logros…";
}
