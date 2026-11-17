import type { Seccion } from "./tipos";

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
