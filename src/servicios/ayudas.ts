// Textos de ayuda de la spec 007 del Back (etapa A), que el Front arma sin pedir nada a la API:
// el apartado «Antes de subir» de P3 (US-60, J-44) y el párrafo «Qué corregir» de P4 (US-61, J-43), que la spec 008
// extiende a las filas rechazadas y al aviso del puntaje máximo (US-77).
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
 * Parte de la tabla de J-43 con una entrada por motivo RECHAZA_CARGA de la sección 6 del contrato. Devuelve null cuando el rechazo
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

/**
 * Spec 008, US-77. Parte de la tabla de J-43 con un consejo por motivo RECHAZA_FILA de la sección 6 del contrato
 * (propuesta). Ninguno remite a Blackboard, porque el export de Química General lo genera la Oficina de Calidad.
 */
export const QUE_CORREGIR_FILA: ReadonlyMap<string, string> = new Map([
  [
    "NIVEL_FUERA_DE_ESCALA",
    "Algunas filas traen un valor fuera de 1 a 4. Si registró la nota sobre 20, conviértala al nivel de 1 a 4 de la rúbrica del curso.",
  ],
  ["NIVEL_NO_NUMERICO", "Algunas filas traen un nivel que no es un entero, como 3,5. Escriba un nivel entero de 1 a 4."],
  ["CODIGO_VACIO", "Algunas filas no traen el código del estudiante. Complete la columna Username o Student ID."],
  ["CODIGO_DUPLICADO", "Un mismo código aparece en dos filas. Deje una sola fila por estudiante."],
  ["CODIGO_INVALIDO", "Algunos códigos no tienen 8 cifras. Revise la columna Username o Student ID."],
]);

/**
 * Spec 008, US-77. Parte de la tabla de J-43 para los avisos (propuesta). Devuelve null cuando el aviso no trae el PI
 * que el consejo nombra.
 */
export const QUE_CORREGIR_AVISO: ReadonlyMap<string, (pi: string | null) => string | null> = new Map([
  [
    "PUNTAJE_MAXIMO_DISTINTO",
    (pi: string | null) =>
      pi === null
        ? null
        : `La columna del PI ${pi} no declara un puntaje máximo de 4. Revise que cada celda sea el nivel de 1 a 4 y no ` +
          "la nota del instrumento.",
  ],
]);

/**
 * Consejo de la carga RECHAZADA sin ningún RECHAZA_CARGA y sin filas aceptadas (SIN_FILAS_ACEPTADAS del Back). Desde el
 * 2026-11-23 no nombra Blackboard (FR-012 de la spec 008 y cambio fechado de que_corregir.feature de la spec 007).
 */
export const CORREGIR_SIN_FILAS_ACEPTADAS =
  "Corrija el archivo en cada fila de la tabla de rechazos y suba el archivo nuevo. Si recibió el export de la " +
  "Oficina de Calidad, pídale uno corregido.";

/** Texto de P4 bajo el consejo de una carga PUBLICADA, que remite al reemplazo de P5 sin botón propio (J-53). */
export const REMISION_AL_REEMPLAZO = "Para cambiar esta carga, use «Reemplazar carga» en Cargas.";

/**
 * Texto que sigue a «Qué corregir.» en P4, o null si no hay nada que la tabla sepa decir. Una carga RECHAZADA lee su
 * RECHAZA_CARGA o, sin filas aceptadas, el texto de la tabla de rechazos. Una carga PUBLICADA (spec 008, US-77) une
 * el consejo de cada motivo RECHAZA_FILA en el orden en que aparece por primera vez. El aviso PUNTAJE_MAXIMO_DISTINTO
 * no va aquí, sino arriba en P4 con consejosDeAvisos(). Un motivo desconocido no muestra consejo, y el mensaje de la
 * API queda como único texto.
 */
export function queCorregir(constancia: Constancia, rol: Rol): string | null {
  if (constancia.estado === "PUBLICADA") {
    const motivos = new Set(constancia.rechazos.filter((r) => r.efecto === "RECHAZA_FILA").map((r) => r.motivo));
    const consejos = [...motivos].flatMap((m) => QUE_CORREGIR_FILA.get(m) ?? []);
    return consejos.length === 0 ? null : consejos.join(" ");
  }
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

/**
 * Spec 008, US-77. Consejos de los avisos de una carga PUBLICADA o RECHAZADA que P4 muestra arriba, uno por aviso con
 * consejo y sin repetir el mismo texto. Una carga EN_CURSO o REEMPLAZADA no recibe ninguno.
 */
export function consejosDeAvisos(constancia: Constancia): string[] {
  if (constancia.estado !== "PUBLICADA" && constancia.estado !== "RECHAZADA") return [];
  const consejos = constancia.avisos.flatMap((a) => QUE_CORREGIR_AVISO.get(a.motivo)?.(a.pi) ?? []);
  return [...new Set(consejos)];
}
