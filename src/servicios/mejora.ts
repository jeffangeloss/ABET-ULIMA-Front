// Spec 005. Textos y reglas de P4 que no calculan nada de la API. El semáforo, el hallazgo y el tipo de cada PI llegan
// decididos de la ruta 13, y aquí solo se eligen sus palabras (contrato, sección 13, y frontend.md, sección 10.2).
import { meta } from "./formato";
import type { IndicadorDeCarga, Semaforo, TipoRegistro } from "./tipos";

/** J-39. Tope de cada causa y de cada acción, en puntos de código, el mismo que cuenta el Back. */
export const TOPE_DE_CARACTERES = 800;

export const MSG_TOPE = "Cada campo admite hasta 800 caracteres.";
export const MSG_GUARDANDO = "Guardando…";
export const MSG_NO_GUARDO = "No se pudo guardar el borrador. Su texto sigue en pantalla.";
export const NOTA_DATOS = "No escriba nombres, códigos ni correos de estudiantes.";
export const NOTA_RECUADROS = "Sus textos van a los recuadros A y B del R-17.";
export const SIN_DECLARAR_COORDINADOR = "El profesor todavía no declara el análisis por indicador.";
export const R17_PROFESOR = "El R-17 se habilita cuando registre y declare la causa y la acción de cada indicador.";
export const R17_COORDINADOR = "El R-17 se habilita cuando el profesor de la sección declare el análisis por indicador.";

/**
 * Cuenta como el Back (AD-10). Normaliza a NFC, cambia \r\n por \n y cuenta puntos de código, de modo que un emoji vale
 * uno aunque ocupe dos unidades de UTF-16.
 */
export function contarCaracteres(texto: string): number {
  return Array.from(texto.normalize("NFC").replace(/\r\n/g, "\n")).length;
}

/** Rótulo del bloque y de sus dos campos según el tipo que fija el semáforo (propuestas de la spec 005). */
export const ROTULOS: Record<TipoRegistro, { tipo: string; causa: string; accion: string }> = {
  OPORTUNIDAD_MEJORA: { tipo: "Oportunidad de mejora", causa: "Causa probable", accion: "Acción de mejora" },
  BUENA_PRACTICA: { tipo: "Buena práctica", causa: "Causa del logro", accion: "Buena práctica que conviene mantener o compartir" },
};

const TEXTO_DEL_SEMAFORO: Record<Exclude<Semaforo, "SIN_DATO">, string> = {
  VERDE: "En la meta",
  AMBAR: "Cerca de la meta",
  ROJO: "Debajo de la meta",
};

/** El estado de un PI en palabras, que acompaña a la luz y nunca depende solo del color (US-46). */
export function textoDelEstado(i: IndicadorDeCarga): string {
  if (i.semaforo !== "SIN_DATO") return TEXTO_DEL_SEMAFORO[i.semaforo];
  if (i.nivel_esperado === null) return "Sin nivel esperado definido";
  if (i.pct_sobre_calificados === null || i.logrados === null) return `Sin calificaciones (${i.sin_evidencia} sin evidencia)`;
  return "Sin meta definida";
}

/** La leyenda del semáforo, armada con la meta y el corte de la respuesta, o null sin meta (US-46). */
export function leyendaDelSemaforo(metaPct: number | null, corteRojoPct: number | null): string | null {
  if (metaPct === null) return null;
  const laMeta = meta(metaPct);
  if (corteRojoPct === null) return `Verde, el logro alcanza la meta de ${laMeta}. Rojo, todavía no la alcanza.`;
  const corte = meta(corteRojoPct);
  return `Verde, desde la meta de ${laMeta}. Ámbar, desde ${corte} hasta debajo de la meta. Rojo, debajo de ${corte}.`;
}
