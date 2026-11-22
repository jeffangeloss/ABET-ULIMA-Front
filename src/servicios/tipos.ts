// Tipos de las respuestas del contrato (docs/03-api/contrato.md). Ningún tipo trae el valor leído de
// una celda ni un nombre de estudiante, porque la API no los manda.

export type Rol = "PROFESOR" | "COORDINADOR";

export interface Usuario {
  correo: string;
  rol: Rol;
}

export type EstadoSeccion = "PUBLICADA" | "SIN_CARGA";

export interface Seccion {
  seccion_id: number;
  asignatura: { codigo: string; nombre: string };
  numero: string;
  periodo: string;
  pi: string[];
  tiene_plan: boolean;
  estado: EstadoSeccion;
  carga_id: number | null;
  filas_leidas: number | null;
  filas_aceptadas: number | null;
}

export type EstadoCarga = "EN_CURSO" | "PUBLICADA" | "RECHAZADA" | "REEMPLAZADA";

export interface Rechazo {
  fila: number | null;
  pi: string | null;
  motivo: string;
  efecto: "RECHAZA_FILA" | "RECHAZA_CARGA";
  mensaje: string;
}

export interface Aviso {
  pi: string | null;
  motivo: string;
  efecto: "AVISO";
  mensaje: string;
}

export interface ColumnaDeclarada {
  pi: string;
  puntaje_maximo_declarado: number;
}

export interface Constancia {
  carga_id: number;
  estado: EstadoCarga;
  seccion: { seccion_id: number; asignatura: string; numero: string; periodo: string };
  nombre_archivo: string;
  /** Nula en un export de texto (.csv o .xls), que no tiene hoja (spec 003, US-34). */
  hoja: string | null;
  sha256: string;
  filas_de_datos: number;
  filas_leidas: number;
  filas_aceptadas: number;
  filas_rechazadas: number;
  mensaje: string | null;
  columnas: ColumnaDeclarada[];
  rechazos: Rechazo[];
  avisos: Aviso[];
  conjunto_reglas: string;
  conjunto_reglas_estado: string;
  parametros_pendientes: string[];
  provisional: boolean;
  programa_version: string;
  subida_por: string;
  iniciada_en: string;
  terminada_en: string;
  /** Corte 2. La carga que esta reemplaza, o null sin reemplazo (BR-CARGA-19). */
  reemplaza_carga_id: number | null;
  /** Corte 2. La carga que reemplaza a esta, o null sin reemplazo (BR-CARGA-20). */
  reemplazada_por: number | null;
}

export interface ResultadoSubida {
  /** Verdadero con el 200, cuando el mismo archivo ya estaba publicado en la sección. */
  yaCargada: boolean;
  constancia: Constancia;
  /** Texto del 200 de un reemplazo con el mismo archivo de la carga publicada, o null. */
  aviso: string | null;
}

/** Conteos de filas de una carga, comunes a la constancia y a la constancia resumida. */
export interface ConteoFilas {
  filas_leidas: number;
  filas_aceptadas: number;
  filas_rechazadas: number;
}

/** Corte 2. Elemento de GET /api/cargas (contrato, sección 7). */
export interface CargaResumida extends ConteoFilas {
  carga_id: number;
  estado: EstadoCarga;
  seccion: { seccion_id: number; asignatura: string; numero: string; periodo: string };
  nombre_archivo: string;
  /** Los primeros 12 caracteres de la huella SHA-256. */
  sha256_corto: string;
  /** Motivo del RECHAZA_CARGA de una carga RECHAZADA. P5 no lo muestra. */
  motivo: string | null;
  reemplaza_carga_id: number | null;
  reemplazada_por: number | null;
  subida_por: string | null;
  iniciada_en: string;
  terminada_en: string;
}

/** Spec 004. SO que mide el plan de alguna sección de GET /api/resultados (contrato, sección 12). */
export interface SoDelPlan {
  numero: number;
  descripcion: string;
}

/** Spec 004. Un PI de una sección con las cifras de abet.v_r17_por_pi, las del bloque II de su R-17. */
export interface Indicador {
  so: number;
  pi: string;
  instrumento: string | null;
  nivel_esperado: number | null;
  /** Estudiantes en los niveles 1, 2, 3 y 4. */
  estudiantes_por_nivel: [number, number, number, number];
  logrados: number | null;
  calificados: number;
  sin_evidencia: number;
  total: number;
  /** Porcentaje de un decimal, o null cuando el PI no tiene calificaciones o no hay nivel esperado. Nunca 0 por un nulo. */
  pct_sobre_calificados: number | null;
  pct_sobre_total: number | null;
  meta_pct: number | null;
  /** Lo decide el Back con la regla del R-17. P6 no compara cifras. */
  en_meta: boolean | null;
}

/** Spec 004. Una sección de GET /api/resultados, con su carga PUBLICADA o en SIN_CARGA. */
export interface SeccionConLogros {
  seccion_id: number;
  asignatura: { codigo: string; nombre: string };
  numero: string;
  estado: EstadoSeccion;
  carga_id: number | null;
  pi: string[];
  conjunto_reglas: string | null;
  conjunto_reglas_estado: string | null;
  parametros_pendientes: string[] | null;
  provisional: boolean | null;
  indicadores: Indicador[];
}

/** Spec 004. Cuerpo de GET /api/resultados (contrato, sección 12). */
export interface Resultados {
  periodo: string;
  so: SoDelPlan[];
  secciones: SeccionConLogros[];
}
