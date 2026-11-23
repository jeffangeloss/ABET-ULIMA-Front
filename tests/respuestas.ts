// Respuestas del contrato (docs/03-api/contrato.md) con datos inventados. Viven solo aquí, nunca en src/.
import type {
  Avance,
  CargaResumida,
  Constancia,
  Indicador,
  Resultados,
  Seccion,
  SeccionConLogros,
  SeccionDeAvance,
} from "../src/servicios/tipos";

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
  reemplaza_carga_id: null,
  reemplazada_por: null,
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

// Corte 2. Constancias de un reemplazo en la 410, la 11 vigente que reemplaza a la 10.
export const constanciaVigenteQueReemplaza: Constancia = {
  ...constanciaLimpia,
  carga_id: 11,
  nombre_archivo: "sintetico_20262_450002_410.xlsx",
  reemplaza_carga_id: 10,
};

export const constanciaReemplazada: Constancia = {
  ...constanciaConError,
  carga_id: 10,
  estado: "REEMPLAZADA",
  reemplazada_por: 11,
};

// Corte 2. GET /api/cargas, de la más reciente a la más antigua (contrato, sección 7).
const seccion410 = { seccion_id: 1, asignatura: "450002", numero: "410", periodo: "2026-2" };

export const cargaVigente410: CargaResumida = {
  carga_id: 11,
  estado: "PUBLICADA",
  seccion: seccion410,
  nombre_archivo: "sintetico_20262_450002_410.xlsx",
  sha256_corto: "3f2a9c1b7d4e",
  filas_leidas: 11,
  filas_aceptadas: 11,
  filas_rechazadas: 0,
  motivo: null,
  reemplaza_carga_id: 10,
  reemplazada_por: null,
  subida_por: "docente410@example.invalid",
  iniciada_en: "2026-11-17T10:15:00.000000-05:00",
  terminada_en: "2026-11-17T10:15:01.000000-05:00",
};

export const cargaReemplazada410: CargaResumida = {
  ...cargaVigente410,
  carga_id: 10,
  estado: "REEMPLAZADA",
  nombre_archivo: "export_inventado_410_con_error.xlsx",
  sha256_corto: "b7c6d5e4f3a2",
  filas_aceptadas: 10,
  filas_rechazadas: 1,
  reemplaza_carga_id: null,
  reemplazada_por: 11,
  iniciada_en: "2026-11-16T09:00:00.000000-05:00",
  terminada_en: "2026-11-16T09:00:02.000000-05:00",
};

export const cargaRechazada410: CargaResumida = {
  ...cargaVigente410,
  carga_id: 9,
  estado: "RECHAZADA",
  nombre_archivo: "export_inventado_411.xlsx",
  sha256_corto: "c1d2e3f4a5b6",
  filas_leidas: 0,
  filas_aceptadas: 0,
  filas_rechazadas: 0,
  motivo: "SECCION_NO_COINCIDE",
  reemplaza_carga_id: null,
  reemplazada_por: null,
  iniciada_en: "2026-11-15T08:00:00.000000-05:00",
  terminada_en: "2026-11-15T08:00:01.000000-05:00",
};

export const cargasDe410 = [cargaVigente410, cargaReemplazada410, cargaRechazada410];

// La misma lista con campos que la API no manda, con un nombre, un valor leído y una ruta local inventados.
export const cargasConCamposDeMas = cargasDe410.map((c) => ({
  ...c,
  nombre_estudiante: "Persona Inventada",
  estudiantes: [{ codigo: "99000002", nombre: "Persona Inventada", valor_leido: "5" }],
  valor_leido: "5",
  ruta_local: "C:\\Users\\docente\\Descargas\\export.xlsx",
}));

// Spec 004, respuestas de GET /api/resultados (contrato, sección 12) con las cifras de la tabla de spec.md del Back.
export const SO_2 = { numero: 2, descripcion: "Habilidad para aplicar diseños de ingeniería para producir soluciones." };
export const SO_5 = { numero: 5, descripcion: "Habilidad para trabajar efectivamente en un equipo." };
const PENDIENTES_BORRADOR = ["TRATO_SIN_EVIDENCIA", "CORTE_ROJO", "CONVERSION_NIVEL_0_1"];

/** Indicador sin estudiantes sin evidencia, con el nivel esperado 3 y la meta 80,0 de R-2026-BORRADOR. */
export function indicador(so: number, pi: string, reparto: [number, number, number, number], pct: number,
                          enMeta: boolean, cambios: Partial<Indicador> = {}): Indicador {
  const calificados = reparto[0] + reparto[1] + reparto[2] + reparto[3];
  return {
    so, pi, instrumento: "Trabajo Integrador", nivel_esperado: 3, estudiantes_por_nivel: reparto,
    logrados: reparto[2] + reparto[3], calificados, sin_evidencia: 0, total: calificados,
    pct_sobre_calificados: pct, pct_sobre_total: pct, meta_pct: 80.0, en_meta: enMeta, ...cambios,
  };
}

export function seccionConCarga(seccionId: number, codigo: string, nombre: string, numero: string, cargaId: number,
                                indicadores: Indicador[], cambios: Partial<SeccionConLogros> = {}): SeccionConLogros {
  return {
    seccion_id: seccionId, asignatura: { codigo, nombre }, numero, estado: "PUBLICADA", carga_id: cargaId,
    pi: indicadores.map((i) => i.pi), conjunto_reglas: "R-2026-BORRADOR", conjunto_reglas_estado: "BORRADOR",
    parametros_pendientes: PENDIENTES_BORRADOR, provisional: true, indicadores, ...cambios,
  };
}

export function seccionSinCargaDeLogros(seccionId: number, codigo: string, nombre: string, numero: string,
                                        pi: string[]): SeccionConLogros {
  return {
    seccion_id: seccionId, asignatura: { codigo, nombre }, numero, estado: "SIN_CARGA", carga_id: null, pi,
    conjunto_reglas: null, conjunto_reglas_estado: null, parametros_pendientes: null, provisional: null, indicadores: [],
  };
}

const SOSTENIBLE = "Principios de Ingeniería Sostenible";
const RESIDUOS = "Gestión Sostenible de Residuos";

// Las tres cargas de docente.varias@example.invalid (escenario «El profesor de varias secciones ve sus logros agrupados por SO»).
export const resultadosDeVarias: Resultados = {
  periodo: "2026-2",
  so: [SO_2, SO_5],
  secciones: [
    seccionConCarga(3, "450002", SOSTENIBLE, "412", 9, [
      indicador(5, "5.1", [1, 1, 5, 4], 81.8, true),
      indicador(5, "5.2", [2, 3, 4, 2], 54.5, false),
      indicador(5, "5.3", [0, 1, 4, 6], 90.9, true),
    ]),
    seccionConCarga(4, "450010", RESIDUOS, "410", 10, [
      indicador(2, "2.1", [1, 2, 4, 4], 72.7, false),
      indicador(2, "2.2", [2, 4, 3, 2], 45.5, false),
      indicador(5, "5.1", [3, 4, 3, 1], 36.4, false),
    ]),
    seccionConCarga(5, "450010", RESIDUOS, "412", 11, [
      indicador(2, "2.1", [0, 1, 5, 5], 90.9, true),
      indicador(2, "2.2", [1, 3, 5, 2], 63.6, false),
      indicador(5, "5.1", [2, 3, 3, 3], 54.5, false),
    ]),
  ],
};

// La 412 de 450002 publicada y las dos de 450010 sin carga (escenario «P6 ofrece el R-17 de cada sección publicada»).
export const resultadosConUnaPublicada: Resultados = {
  periodo: "2026-2",
  so: [SO_2, SO_5],
  secciones: [
    resultadosDeVarias.secciones[0],
    seccionSinCargaDeLogros(4, "450010", RESIDUOS, "410", ["2.1", "2.2", "5.1"]),
    seccionSinCargaDeLogros(5, "450010", RESIDUOS, "412", ["2.1", "2.2", "5.1"]),
  ],
};

// La 410 del export correcto (escenario «El reparto por nivel suma los calificados»).
export const resultados410: Resultados = {
  periodo: "2026-2",
  so: [SO_5],
  secciones: [
    seccionConCarga(1, "450002", SOSTENIBLE, "410", 7, [
      indicador(5, "5.1", [1, 3, 4, 3], 63.6, false),
      indicador(5, "5.2", [1, 3, 4, 3], 63.6, false),
      indicador(5, "5.3", [1, 2, 5, 3], 72.7, false),
    ]),
  ],
};

// Lo que no se mide: la 410 con el 5.3 sin calificaciones y el 5.2 con un estudiante sin evidencia, y una sección sin carga.
export const resultadosSinMedir: Resultados = {
  periodo: "2026-2",
  so: [SO_2, SO_5],
  secciones: [
    seccionConCarga(1, "450002", SOSTENIBLE, "410", 7, [
      indicador(5, "5.1", [1, 3, 4, 3], 63.6, false),
      indicador(5, "5.2", [1, 3, 3, 3], 60.0, false, { sin_evidencia: 1, total: 11, pct_sobre_total: 54.5 }),
      indicador(5, "5.3", [0, 0, 0, 0], 0, false, {
        logrados: 0, sin_evidencia: 11, total: 11, pct_sobre_calificados: null, pct_sobre_total: 0.0, en_meta: null,
      }),
    ]),
    seccionSinCargaDeLogros(4, "450010", RESIDUOS, "410", ["2.1", "2.2", "5.1"]),
  ],
};

// El coordinador con las cinco secciones. La 411 trae el mejor logro y aun así va después de la 410.
export const resultadosDelCoordinador: Resultados = {
  periodo: "2026-2",
  so: [SO_2, SO_5],
  secciones: [
    resultados410.secciones[0],
    seccionConCarga(2, "450002", SOSTENIBLE, "411", 8, [
      indicador(5, "5.1", [0, 0, 5, 6], 100.0, true),
      indicador(5, "5.2", [0, 0, 5, 6], 100.0, true),
      indicador(5, "5.3", [0, 0, 5, 6], 100.0, true),
    ]),
    ...resultadosDeVarias.secciones,
  ],
};

// Spec 008. Las secciones inventadas 701 a 704 de 5643 en 2026-1 (quimica_2026_1_inventado.sql del Back) y las
// cuentas de la coordinación con el campo aditivo alcance de la ruta 2 (contrato, sección 15.3).
const QUIMICA = { codigo: "5643", nombre: "Química General" };

export const usuarioDocente701 = {
  correo: "docente701@example.invalid",
  rol: "PROFESOR" as const,
  alcance: { tipo: "SECCIONES" as const, carreras: [], asignaturas: [] },
};

export const usuarioCoordinacionCurso = {
  correo: "coordinador.quimica@example.invalid",
  rol: "COORDINADOR" as const,
  alcance: { tipo: "CURSO" as const, carreras: [], asignaturas: ["5643"] },
};

export const usuarioCoordinacionCarrera = {
  correo: "coordinacion@example.invalid",
  rol: "COORDINADOR" as const,
  alcance: { tipo: "CARRERA" as const, carreras: ["AMB"], asignaturas: [] },
};

/** Una sección de 5643 en 2026-1 sin carga, con el PI 6.1 del plan (D-48). */
export function seccionQuimica(seccionId: number, numero: string): Seccion {
  return {
    seccion_id: seccionId,
    asignatura: QUIMICA,
    numero,
    periodo: "2026-1",
    pi: ["6.1"],
    tiene_plan: true,
    estado: "SIN_CARGA",
    carga_id: null,
    filas_leidas: null,
    filas_aceptadas: null,
  };
}

export const seccion701 = seccionQuimica(21, "701");

/** La carga 8 de la 701, RECHAZADA por un export de otra sección. */
export const cargaRechazada701: CargaResumida = {
  ...cargaRechazada410,
  carga_id: 8,
  seccion: { seccion_id: 21, asignatura: "5643", numero: "701", periodo: "2026-1" },
  nombre_archivo: "sintetico_20261_5643_702.xlsx",
  subida_por: "docente701@example.invalid",
};

/** La misma carga 8 vista en P4, con el RECHAZA_CARGA de SECCION_NO_COINCIDE. */
export const constanciaOtraSeccion701: Constancia = {
  ...constanciaOtraSeccion,
  carga_id: 8,
  seccion: { seccion_id: 21, asignatura: "5643", numero: "701", periodo: "2026-1" },
  nombre_archivo: "sintetico_20261_5643_702.xlsx",
  hoja: "gc_SINTETICO_20261_5643_702_f",
  mensaje: "El archivo corresponde a la sección 702 y usted eligió la 701. No se publicó.",
  rechazos: [
    {
      fila: null,
      pi: null,
      motivo: "SECCION_NO_COINCIDE",
      efecto: "RECHAZA_CARGA",
      mensaje: "El archivo corresponde a la sección 702 y usted eligió la 701. No se publicó.",
    },
  ],
};

/** P6 de 2026-1 sin cargas publicadas. */
export const resultadosQuimica: Resultados = {
  periodo: "2026-1",
  so: [],
  secciones: [],
};

// Ruta 17 (contrato, secciones 14.2 y 15.5). La etapa la decide la API y P7 nunca la calcula.

function filaDeAvance(seccionId: number, codigo: string, nombre: string, numero: string, etapa: SeccionDeAvance["etapa"],
  cargaId: number | null = null): SeccionDeAvance {
  return { seccion_id: seccionId, asignatura: { codigo, nombre }, numero, etapa, carga_id: cargaId };
}

const AV_PRINCIPIOS = ["450002", "Principios de Ingeniería Sostenible"] as const;
const AV_RESIDUOS = ["450010", "Gestión Sostenible de Residuos"] as const;
const AV_IMPACTO = ["450020", "Evaluación del Impacto Ambiental"] as const;

/**
 * La respuesta del primer escenario de US-64 de la spec 007 (contrato, sección 14.2), con el campo profesores de US-66,
 * que P7 no muestra mientras D-47 no se responda.
 */
export const avanceAmbiental: Avance = {
  periodo: "2026-2",
  conteo: { secciones: 5, PUBLICADA: 1, CON_RECHAZO: 1, SIN_CARGA: 1, SIN_PROFESOR: 1, SIN_PLAN: 1 },
  secciones: [
    { ...filaDeAvance(1, ...AV_PRINCIPIOS, "410", "PUBLICADA", 7), profesores: [] },
    { ...filaDeAvance(2, ...AV_PRINCIPIOS, "411", "CON_RECHAZO"), profesores: ["docente411@example.invalid"] },
    { ...filaDeAvance(3, ...AV_RESIDUOS, "412", "SIN_CARGA"), profesores: ["docente410@example.invalid"] },
    { ...filaDeAvance(4, ...AV_RESIDUOS, "413", "SIN_PROFESOR"), profesores: [] },
    { ...filaDeAvance(5, ...AV_IMPACTO, "414", "SIN_PLAN"), profesores: [] },
  ],
};

/** La ruta 17 de la coordinación del curso en 2026-1 (contrato, sección 15.5), sin el campo profesores (D-51). */
export const avance5643: Avance = {
  periodo: "2026-1",
  conteo: { secciones: 4, PUBLICADA: 1, CON_RECHAZO: 1, SIN_CARGA: 1, SIN_PROFESOR: 1, SIN_PLAN: 0 },
  secciones: [
    filaDeAvance(21, QUIMICA.codigo, QUIMICA.nombre, "701", "PUBLICADA", 31),
    filaDeAvance(22, QUIMICA.codigo, QUIMICA.nombre, "702", "CON_RECHAZO"),
    filaDeAvance(23, QUIMICA.codigo, QUIMICA.nombre, "703", "SIN_CARGA"),
    filaDeAvance(24, QUIMICA.codigo, QUIMICA.nombre, "704", "SIN_PROFESOR"),
  ],
};

/** La carga 31 de la 701, PUBLICADA sin rechazos, que P7 abre en P4 con «Ver la carga». */
export const constanciaPublicada701: Constancia = {
  ...constanciaLimpia,
  carga_id: 31,
  seccion: { seccion_id: 21, asignatura: "5643", numero: "701", periodo: "2026-1" },
  nombre_archivo: "sintetico_20261_5643_701.xlsx",
  hoja: "gc_SINTETICO_20261_5643_701_f",
  columnas: [{ pi: "6.1", puntaje_maximo_declarado: 4 }],
  subida_por: "docente701@example.invalid",
};
