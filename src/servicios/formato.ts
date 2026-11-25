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

/** «2,91», el promedio de calificación de la ruta 20 con dos decimales y coma, sin redondear otra vez (spec 009). */
export function promedio(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

/**
 * El resto hasta 100 de un porcentaje de un decimal, como el 30,3 % que sigue al 69,7 % en la barra de dos tramos de P8.
 * Resta en décimas enteras para no arrastrar el error del punto flotante, y no vuelve a calcular ninguna cifra de la API.
 */
export function complementoDelPorcentaje(valor: number): number {
  return (1000 - Math.round(valor * 10)) / 10;
}

/** «9 de 11», cuántos estudiantes logran el nivel esperado de cuántos. */
export function fraccion(logrados: number, de: number): string {
  return `${logrados} de ${de}`;
}

/**
 * Texto de la franja provisional de una sección de la ruta 12 o de una carga de la ruta 13, como _franja del R-17, o null si
 * no es provisional (spec 004 y US-46 de la spec 005).
 */
export function franjaProvisional(s: {
  provisional: boolean | null;
  conjunto_reglas: string | null;
  conjunto_reglas_estado: string | null;
}): string | null {
  if (s.provisional !== true) return null;
  if (s.conjunto_reglas_estado === "APROBADO") {
    return (
      `Resultados provisionales. El conjunto de reglas ${s.conjunto_reglas} está aprobado, pero no define todos los ` +
      "parámetros que usan estos resultados. No usar como evidencia oficial."
    );
  }
  return (
    `Resultados provisionales. Las reglas de la carrera (conjunto ${s.conjunto_reglas}) aún no están aprobadas. ` +
    "No usar como evidencia oficial."
  );
}

/** «15:10», la hora de Lima de un instante ISO 8601, para «Borrador guardado a las 15:10» (spec 005, US-48). */
export function horaCorta(iso: string): string {
  return horaDeLima(iso).slice(-5);
}
