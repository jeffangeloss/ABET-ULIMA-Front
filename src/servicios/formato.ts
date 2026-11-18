import type { ConteoFilas, Seccion } from "./tipos";

const FORMATO_LIMA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Muestra una hora ISO 8601 como «28/10/2026 10:15» en hora de Lima (contrato, sección 3.4). */
export function horaDeLima(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const partes = Object.fromEntries(FORMATO_LIMA.formatToParts(fecha).map((p) => [p.type, p.value]));
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

/** «450002 Principios de Ingeniería Sostenible, sección 410, 2026-2». */
export function etiquetaSeccion(s: Seccion): string {
  return `${s.asignatura.codigo} ${s.asignatura.nombre}, sección ${s.numero}, ${s.periodo}`;
}

/** «11 filas leídas, 10 aceptadas y 1 rechazada», la forma de P4 y P5. */
export function resumenFilas(c: ConteoFilas): string {
  const leidas = c.filas_leidas === 1 ? "1 fila leída" : `${c.filas_leidas} filas leídas`;
  const aceptadas = c.filas_aceptadas === 1 ? "1 aceptada" : `${c.filas_aceptadas} aceptadas`;
  const rechazadas = c.filas_rechazadas === 1 ? "1 rechazada" : `${c.filas_rechazadas} rechazadas`;
  return `${leidas}, ${aceptadas} y ${rechazadas}`;
}

/** «81,8 %», el porcentaje de un decimal de la ruta 12 con coma decimal, sin redondear otra vez (spec 004). */
export function porcentaje(valor: number): string {
  return `${valor.toFixed(1).replace(".", ",")} %`;
}

/** «80 %» o «75,5 %», la meta sin decimal cuando es entera, como en el texto «Meta 80 %» de P6. */
export function meta(valor: number): string {
  return `${Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(".", ",")} %`;
}

/** «9 de 11», cuántos estudiantes logran el nivel esperado de cuántos. */
export function fraccion(logrados: number, de: number): string {
  return `${logrados} de ${de}`;
}
