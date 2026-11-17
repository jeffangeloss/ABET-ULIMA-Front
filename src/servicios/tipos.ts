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
}

export interface ResultadoSubida {
  /** Verdadero con el 200, cuando el mismo archivo ya estaba publicado en la sección. */
  yaCargada: boolean;
  constancia: Constancia;
}
