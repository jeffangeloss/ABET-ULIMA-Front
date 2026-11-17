// Respuestas del contrato (docs/03-api/contrato.md) con datos inventados. Viven solo aquí, nunca en src/.
import type { Constancia, Seccion } from "../src/servicios/tipos";

export const SHA = "a".repeat(64);

export const usuarioProfesor = { correo: "docente410@example.invalid", rol: "PROFESOR" as const };
export const usuarioCoordinador = { correo: "coord@example.invalid", rol: "COORDINADOR" as const };

export const seccionPublicada: Seccion = {
  seccion_id: 1,
  asignatura: { codigo: "450002", nombre: "Principios de Ingeniería Sostenible" },
  numero: "410",
  periodo: "2026-2",
  pi: ["5.1", "5.2", "5.3"],
  tiene_plan: true,
  estado: "PUBLICADA",
  carga_id: 7,
  filas_leidas: 11,
  filas_aceptadas: 11,
};

export const seccionSinCarga: Seccion = {
  seccion_id: 2,
  asignatura: { codigo: "450010", nombre: "Gestión Ambiental" },
  numero: "412",
  periodo: "2026-2",
  pi: ["6.1", "6.2"],
  tiene_plan: true,
  estado: "SIN_CARGA",
  carga_id: null,
  filas_leidas: null,
  filas_aceptadas: null,
};

export const seccionSinPlan: Seccion = {
  seccion_id: 3,
  asignatura: { codigo: "450010", nombre: "Gestión Ambiental" },
  numero: "410",
  periodo: "2026-2",
  pi: [],
  tiene_plan: false,
  estado: "SIN_CARGA",
  carga_id: null,
  filas_leidas: null,
  filas_aceptadas: null,
};

const base = {
  seccion: { seccion_id: 1, asignatura: "450002", numero: "410", periodo: "2026-2" },
  sha256: SHA,
  conjunto_reglas: "R-2026-BORRADOR",
  conjunto_reglas_estado: "BORRADOR",
  parametros_pendientes: ["TRATO_SIN_EVIDENCIA", "CORTE_ROJO", "CONVERSION_NIVEL_0_1"],
  provisional: true,
  programa_version: "0.1.0",
  subida_por: "docente410@example.invalid",
  iniciada_en: "2026-10-28T10:15:00-05:00",
  terminada_en: "2026-10-28T10:15:02-05:00",
};

// Respuesta 201 con el 5 en la columna 5.2 de la fila 3.
export const constanciaConError: Constancia = {
  ...base,
  carga_id: 7,
  estado: "PUBLICADA",
  nombre_archivo: "export_inventado_410_con_error.xlsx",
  hoja: "gc_SINTETICO_20262_450002_410_f",
  filas_de_datos: 11,
  filas_leidas: 11,
  filas_aceptadas: 10,
  filas_rechazadas: 1,
  mensaje: null,
  columnas: [
    { pi: "5.1", puntaje_maximo_declarado: 4 },
    { pi: "5.2", puntaje_maximo_declarado: 4 },
    { pi: "5.3", puntaje_maximo_declarado: 20 },
  ],
  rechazos: [
    {
      fila: 3,
      pi: "5.2",
      motivo: "NIVEL_FUERA_DE_ESCALA",
      efecto: "RECHAZA_FILA",
      mensaje: "Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.",
    },
  ],
  avisos: [
    {
      pi: "5.3",
      motivo: "PUNTAJE_MAXIMO_DISTINTO",
      efecto: "AVISO",
      mensaje: "PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.",
    },
  ],
};

export const constanciaLimpia: Constancia = {
  ...constanciaConError,
  nombre_archivo: "export_inventado_410.xlsx",
  filas_aceptadas: 11,
  filas_rechazadas: 0,
  rechazos: [],
  avisos: [],
};

export const constanciaSinColumna: Constancia = {
  ...base,
  carga_id: 8,
  estado: "RECHAZADA",
  nombre_archivo: "export_inventado_410_sin_52.xlsx",
  hoja: "gc_SINTETICO_20262_450002_410_f",
  filas_de_datos: 11,
  filas_leidas: 0,
  filas_aceptadas: 0,
  filas_rechazadas: 0,
  mensaje: "Falta la columna del PI 5.2 que el plan de medición pide para esta sección.",
  columnas: [],
  rechazos: [
    {
      fila: null,
      pi: "5.2",
      motivo: "PI_DEL_PLAN_AUSENTE",
      efecto: "RECHAZA_CARGA",
      mensaje: "Falta la columna del PI 5.2 que el plan de medición pide para esta sección.",
    },
  ],
  avisos: [],
};

export const constanciaOtraSeccion: Constancia = {
  ...constanciaSinColumna,
  carga_id: 9,
  mensaje: "El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.",
  rechazos: [
    {
      fila: null,
      pi: null,
      motivo: "SECCION_NO_COINCIDE",
      efecto: "RECHAZA_CARGA",
      mensaje: "El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.",
    },
  ],
};

export const constanciaSinFilasAceptadas: Constancia = {
  ...constanciaConError,
  carga_id: 10,
  estado: "RECHAZADA",
  filas_aceptadas: 0,
  filas_rechazadas: 11,
  mensaje: "Ninguna fila se pudo aceptar. La carga no se publicó.",
  rechazos: [
    {
      fila: 2,
      pi: "5.1",
      motivo: "NIVEL_FUERA_DE_ESCALA",
      efecto: "RECHAZA_FILA",
      mensaje: "Fila 2, PI 5.1, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.2 y 5.3.",
    },
  ],
  avisos: [],
};
