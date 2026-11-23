// Textos de ayuda de la spec 007 del Back (etapa A), que el Front arma sin pedir nada a la API:
// el apartado «Antes de subir» de P3 (US-60, J-44) y el párrafo «Qué corregir» de P4 (US-61, J-43).
// Todos son propuestas hasta la revisión de la spec (docs/01-arquitectura/frontend.md, sección 11).
import type { Constancia, Rol } from "./tipos";

/**
 * Nombre de la columna de Blackboard de un PI, con el valor provisional de D-43 de la spec 005 («ABET SO4.1»), que
 * la regla _ENCABEZADO_DE_PI de abet_carga/lector.py reconoce. Si la carrera cierra D-43 con otro nombre, cambia aquí.
 */
export function nombreDeColumna(pi: string): string {
  return `ABET SO${pi}`;
}

/** «a», «a y b» o «a, b y c». */
export function unirConY(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export const TITULO_ANTES_DE_SUBIR = "Antes de subir";

/** Las líneas de «Antes de subir» que no dependen de la sección (D-06 y D-04), en su orden. */
const LINEAS_FIJAS_ANTES_DE_SUBIR = [
  "En cada columna, un nivel entero de 1 a 4 por estudiante. El puntaje máximo de la columna es 4, y otro puntaje máximo solo deja un aviso.",
  "Conserve la columna Username y no cambie el nombre de las columnas.",
  "Suba el export completo del Centro de calificaciones sin cambiarle el nombre, porque la hoja o el nombre que le pone Blackboard indican la sección.",
] as const;

/** Líneas de «Antes de subir» de una sección, armadas solo con Seccion.pi (J-44). */
export function lineasAntesDeSubir(pi: readonly string[]): string[] {
  const columnas =
    pi.length === 0 ? [] : [`En Blackboard, una columna por PI, con el nombre ${unirConY(pi.map(nombreDeColumna))}.`];
  return [...columnas, ...LINEAS_FIJAS_ANTES_DE_SUBIR];
}

interface Contexto {
  pi: string | null;
  asignatura: string;
  numero: string;
  periodo: string;
  rol: Rol;
}

/**
 * Tabla de J-43, una entrada por motivo RECHAZA_CARGA de la sección 6 del contrato. Devuelve null cuando el rechazo
 * no trae lo que el consejo necesita, como un PI nulo, que el contrato no prevé.
 */
export const QUE_CORREGIR: ReadonlyMap<string, (c: Contexto) => string | null> = new Map([
  [
    "PI_DEL_PLAN_AUSENTE",
    ({ pi }: Contexto) =>
      pi === null
        ? null
        : "Revise en Blackboard que cada PI del plan de esta sección tenga su columna, y cree o renombre la del PI " +
          `${pi} como ${nombreDeColumna(pi)}. Después exporte otra vez y suba el archivo nuevo.`,
  ],
  [
    "PI_REPETIDO",
    ({ pi }: Contexto) =>
      pi === null ? null : `Deje en Blackboard una sola columna del PI ${pi}, exporte otra vez y suba el archivo nuevo.`,
  ],
  [
    "COLUMNA_CODIGO_AUSENTE",
    () => "Exporte otra vez el Centro de calificaciones completo, que trae la columna Username, y suba ese archivo.",
  ],
  [
    "ARCHIVO_SIN_FILAS",
    () => "Exporte otra vez el Centro de calificaciones de la sección con sus estudiantes y suba ese archivo.",
  ],
  [
    "SIN_CALIFICACIONES",
    () =>
      "Registre en Blackboard el nivel de cada estudiante en las columnas de los PI del plan, exporte otra vez y suba el archivo nuevo.",
  ],
  [
    "SECCION_NO_COINCIDE",
    // permisos.puede_subir() no deja al coordinador una carga nueva, así que su consejo lo remite al profesor.
    ({ asignatura, numero, rol }: Contexto) =>
      rol === "COORDINADOR"
        ? `El archivo no es de ${asignatura}, sección ${numero}. Pida al profesor de esa sección que exporte su Centro ` +
          "de calificaciones y lo suba otra vez."
        : `Exporte el Centro de calificaciones de ${asignatura}, sección ${numero}, o suba este archivo en la sección que le corresponde.`,
  ],
  [
    "PERIODO_NO_COINCIDE",
    ({ periodo }: Contexto) => `Exporte el Centro de calificaciones del curso de ${periodo} y suba ese archivo.`,
  ],
]);

/** Consejo de la carga RECHAZADA sin ningún RECHAZA_CARGA y sin filas aceptadas (SIN_FILAS_ACEPTADAS del Back). */
export const CORREGIR_SIN_FILAS_ACEPTADAS =
  "Corrija en Blackboard cada fila de la tabla de rechazos, exporte otra vez y suba el archivo nuevo.";

/**
 * Texto que sigue a «Qué corregir.» en P4, o null si la carga no está RECHAZADA o su motivo no está en la tabla.
 * Un motivo desconocido no muestra consejo, y el mensaje de la API queda como único texto.
 */
export function queCorregir(constancia: Constancia, rol: Rol): string | null {
  if (constancia.estado !== "RECHAZADA") return null;
  const deCarga = constancia.rechazos.find((r) => r.efecto === "RECHAZA_CARGA");
  if (deCarga) {
    const consejo = QUE_CORREGIR.get(deCarga.motivo);
    if (!consejo) return null;
    const { asignatura, numero, periodo } = constancia.seccion;
    return consejo({ pi: deCarga.pi, asignatura, numero, periodo, rol });
  }
  if (constancia.filas_leidas > 0 && constancia.filas_aceptadas === 0) return CORREGIR_SIN_FILAS_ACEPTADAS;
  return null;
}
