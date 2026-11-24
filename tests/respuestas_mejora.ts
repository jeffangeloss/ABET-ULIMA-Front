// Respuestas de las rutas 13 a 16 de la spec 005 (contrato, sección 13) con datos inventados. Las cifras son las de
// semaforo.feature del Back, que salen de NIVELES_410 y NIVELES_450002_412 de scripts/generar_exports_inventados.py.
import type {
  Borrador,
  Declaracion,
  IndicadorDeCarga,
  IndicadoresCarga,
  Mejora,
  RegistroBorrador,
  TipoRegistro,
} from "../src/servicios/tipos";

const OM: TipoRegistro = "OPORTUNIDAD_MEJORA";
const BP: TipoRegistro = "BUENA_PRACTICA";

function indicador(
  pi: string,
  niveles: [number, number, number, number],
  logrados: number,
  pct: number,
  semaforo: IndicadorDeCarga["semaforo"],
): IndicadorDeCarga {
  return {
    so: 5,
    pi,
    instrumento: "Trabajo Integrador",
    nivel_esperado: 3,
    estudiantes_por_nivel: niveles,
    logrados,
    calificados: 11,
    sin_evidencia: 0,
    total: 11,
    pct_sobre_calificados: pct,
    pct_sobre_total: pct,
    meta_pct: 80.0,
    en_meta: semaforo === "VERDE",
    semaforo,
    hallazgo: `${pi}: ${pct.toFixed(1).replace(".", ",")} % en Satisfactorio o más, meta 80,0 %`,
    tipo_registro: semaforo === "VERDE" ? BP : OM,
  };
}

const cabecera = {
  estado: "PUBLICADA" as const,
  provisional: true,
  conjunto_reglas: "R-2026-BORRADOR",
  conjunto_reglas_estado: "BORRADOR",
  parametros_pendientes: ["CONVERSION_NIVEL_0_1", "CORTE_ROJO", "TRATO_SIN_EVIDENCIA"],
  meta_pct: 80.0,
  corte_rojo_pct: null,
};

/** La 410 de 450002 con el export correcto y R-2026-BORRADOR, tres PI en ROJO y tres OM (escenario 1 de US-45). */
export const indicadores410: IndicadoresCarga = {
  ...cabecera,
  carga_id: 7,
  indicadores: [
    indicador("5.1", [1, 3, 4, 3], 7, 63.6, "ROJO"),
    indicador("5.2", [1, 3, 4, 3], 7, 63.6, "ROJO"),
    indicador("5.3", [1, 2, 5, 3], 8, 72.7, "ROJO"),
  ],
};

/** La 412 de 450002 de docente.varias@example.invalid, con VERDE, ROJO y VERDE (escenario 2 de US-45). */
export const indicadores412: IndicadoresCarga = {
  ...cabecera,
  carga_id: 9,
  indicadores: [
    indicador("5.1", [1, 1, 5, 4], 9, 81.8, "VERDE"),
    indicador("5.2", [2, 3, 4, 2], 6, 54.5, "ROJO"),
    indicador("5.3", [0, 1, 4, 6], 10, 90.9, "VERDE"),
  ],
};

/** La copia de la 410 con la columna 5.3 sin ninguna nota (escenario 6 de US-45), con 5.3 SIN_DATO y 11 sin evidencia. */
export const indicadores410SinNotas53: IndicadoresCarga = {
  ...indicadores410,
  indicadores: [
    indicadores410.indicadores[0],
    indicadores410.indicadores[1],
    {
      ...indicadores410.indicadores[2],
      estudiantes_por_nivel: [0, 0, 0, 0],
      logrados: null,
      calificados: 0,
      sin_evidencia: 11,
      pct_sobre_calificados: null,
      pct_sobre_total: 0.0,
      en_meta: null,
      semaforo: "SIN_DATO",
      hallazgo: "5.3: sin calificaciones en esta carga.",
      tipo_registro: null,
    },
  ],
};

/** Los registros de prueba de la 412 de 450002 (Textos de prueba de spec.md). */
export const textos412: Record<string, { causa: string; accion: string }> = {
  "5.1": { causa: "Los grupos presentaron avances semanales en clase.", accion: "Mantener las revisiones semanales del avance." },
  "5.2": { causa: "La entrega coincidió con la semana de parciales.", accion: "Mover la entrega a la semana 10 y revisar el avance en clase." },
  "5.3": { causa: "Los roles del equipo rotaron en cada entrega.", accion: "Compartir la rotación de roles con las otras secciones." },
};

/** Los registros de prueba de la 410, los tres OM. */
export const textos410: Record<string, { causa: string; accion: string }> = {
  "5.1": { causa: "La entrega coincidió con la semana de parciales.", accion: "Mover la entrega a la semana 10 y revisar el avance en clase." },
  "5.2": { causa: "Los grupos no recibieron la rúbrica antes de la entrega.", accion: "Publicar la rúbrica en la semana 8." },
  "5.3": { causa: "El trabajo en equipo se evaluó solo al final.", accion: "Revisar el trabajo en equipo en dos avances." },
};

/** Registros del borrador de una carga con los textos dados, en el orden y con el tipo de su ruta 13. */
export function registrosDe(ind: IndicadoresCarga, textos: Record<string, { causa: string; accion: string }>): RegistroBorrador[] {
  return ind.indicadores
    .filter((i) => i.tipo_registro !== null)
    .map((i) => ({ pi: i.pi, tipo: i.tipo_registro!, causa: textos[i.pi]?.causa ?? null, accion: textos[i.pi]?.accion ?? null }));
}

export function borradorDe(ind: IndicadoresCarga, textos: Record<string, { causa: string; accion: string }>, version = 3): Borrador {
  return { version, actualizado_en: "2026-11-21T15:09:00-05:00", indicadores: registrosDe(ind, textos) };
}

export function declaracionDe(ind: IndicadoresCarga, textos: Record<string, { causa: string; accion: string }>): Declaracion {
  return {
    declarada_en: "2026-11-21T15:10:00-05:00",
    indicadores: registrosDe(ind, textos).map((r) => ({ ...r, causa: r.causa!, accion: r.accion!, estado: "PROPUESTA" as const })),
  };
}

/** Escenario 2 de US-47. Una carga sin texto, para su profesor. */
export const mejoraVacia: Mejora = { declaracion: null, borrador: null, borrador_pendiente: false, heredado_de: null, puede_editar: true };
