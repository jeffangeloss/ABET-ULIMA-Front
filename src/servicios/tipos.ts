// Tipos de las respuestas del contrato (docs/03-api/contrato.md). Ningún tipo trae el valor leído de
// una celda ni un nombre de estudiante, porque la API no los manda.

export type Rol = "PROFESOR" | "COORDINADOR";

/**
 * Spec 008. Tipo del alcance de la cuenta en la ruta 2 (contrato, sección 15.3). SECCIONES es el del PROFESOR, CARRERA el
 * de una coordinación con al menos una fila de carrera y CURSO el de una coordinación con solo filas de asignatura.
 */
export type TipoAlcance = "SECCIONES" | "CARRERA" | "CURSO";

/** Spec 008. Campo aditivo alcance de GET /api/sesion, con códigos de carrera y de asignatura y sin datos de personas. */
export interface Alcance {
  tipo: TipoAlcance;
  carreras: string[];
  asignaturas: string[];
}

export interface Usuario {
  correo: string;
  rol: Rol;
  /** Spec 008. Opcional, porque un Back anterior no lo manda y el Front sigue con los rótulos del rol. */
  alcance?: Alcance;
}

/** Spec 008. Cuerpo de GET /api/periodos, la ruta 18 (contrato, sección 15.2). */
export interface Periodos {
  /** El periodo de PERIODO_VIGENTE, AAAA-C. */
  vigente: string;
  /** Periodos con al menos una sección al alcance del usuario, del más reciente al más antiguo. */
  periodos: string[];
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

/**
 * Spec 007, J-48. Etapa de una sección en la ruta 17, que decide el Back en cada lectura. P7 la muestra y nunca la calcula.
 */
export type Etapa = "SIN_PLAN" | "SIN_PROFESOR" | "CON_RECHAZO" | "SIN_CARGA" | "PUBLICADA";

/** Spec 007, US-64. Una sección de GET /api/avance (contrato, secciones 14.2 y 15.5). */
export interface SeccionDeAvance {
  seccion_id: number;
  asignatura: { codigo: string; nombre: string };
  numero: string;
  etapa: Etapa;
  /** La carga PUBLICADA de la sección, o null sin ella. P7 abre con él P4. */
  carga_id: number | null;
  /** US-66 de la spec 007. Existe solo si D-47 (Ambiental) o D-51 (Industrial) dicen que sí, y P7 todavía no lo muestra. */
  profesores?: string[];
}

/** Spec 007, US-64. Cuerpo de GET /api/avance, la ruta 17, con el alcance de secciones_visibles() (spec 008, US-79). */
export interface Avance {
  periodo: string;
  conteo: { secciones: number } & Record<Etapa, number>;
  secciones: SeccionDeAvance[];
}

/** Spec 005, J-29. Color del semáforo de un PI, que decide el Back con en_meta y CORTE_ROJO. P4 lo muestra y nunca lo calcula. */
export type Semaforo = "VERDE" | "AMBAR" | "ROJO" | "SIN_DATO";

/** Spec 005, D-39. Tipo del registro de un PI, que fija el semáforo. Un PI SIN_DATO no lleva registro (D-40). */
export type TipoRegistro = "OPORTUNIDAD_MEJORA" | "BUENA_PRACTICA";

/** Spec 005, US-45. Un PI de la ruta 13, con las claves de la ruta 12 más el semáforo, el hallazgo y el tipo. */
export interface IndicadorDeCarga extends Indicador {
  semaforo: Semaforo;
  /** Frase del Back, como «5.2: 54,5 % en Satisfactorio o más, meta 80,0 %». P4 la copia sin cambios. */
  hallazgo: string;
  tipo_registro: TipoRegistro | null;
}

/** Spec 005. Cuerpo de GET /api/cargas/{carga_id}/indicadores, la ruta 13 (contrato, sección 13.2). */
export interface IndicadoresCarga {
  carga_id: number;
  estado: EstadoCarga;
  provisional: boolean;
  conjunto_reglas: string;
  conjunto_reglas_estado: string;
  parametros_pendientes: string[];
  meta_pct: number | null;
  /** Nulo mientras CORTE_ROJO siga PENDIENTE, y entonces no hay banda ámbar (D-35). */
  corte_rojo_pct: number | null;
  indicadores: IndicadorDeCarga[];
}

/** Spec 005. La causa y la acción de un PI en el borrador, nulas mientras el profesor no las escribe. */
export interface RegistroBorrador {
  pi: string;
  tipo: TipoRegistro;
  causa: string | null;
  accion: string | null;
}

/** Spec 005. Borrador de la ruta 14 y del 409 de la ruta 15, con una sola versión por carga (contrato, sección 13.3). */
export interface Borrador {
  version: number;
  actualizado_en: string | null;
  indicadores: RegistroBorrador[];
}

/** Spec 005, D-42. Un registro declarado, con el estado PROPUESTA que deriva la ruta 14 sin guardarlo. */
export interface RegistroDeclarado {
  pi: string;
  tipo: TipoRegistro;
  causa: string;
  accion: string;
  estado: "PROPUESTA";
}

/** Spec 005. La declaración vigente de la ruta 14 y el cuerpo del 201 de la ruta 16. */
export interface Declaracion {
  declarada_en: string;
  indicadores: RegistroDeclarado[];
}

/** Spec 005. Cuerpo de GET /api/cargas/{carga_id}/mejora, la ruta 14 (contrato, sección 13.3). */
export interface Mejora {
  declaracion: Declaracion | null;
  /** Nulo para el coordinador, que nunca recibe el texto del borrador. */
  borrador: Borrador | null;
  borrador_pendiente: boolean;
  /** US-54. La carga que esta reemplaza, si el borrador viene de ella, o null. */
  heredado_de: number | null;
  puede_editar: boolean;
}

/** Spec 005. Cuerpo del PUT de la ruta 15, que reemplaza el borrador entero (contrato, sección 13.4). */
export interface CuerpoBorrador {
  version: number;
  indicadores: RegistroBorrador[];
}

/** Spec 005. Respuesta 200 de la ruta 15. */
export interface BorradorGuardado {
  version: number;
  actualizado_en: string | null;
}
