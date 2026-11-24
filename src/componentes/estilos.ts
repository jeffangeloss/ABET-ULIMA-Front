// Clases comunes del sistema visual (spec 008, US-81). Usan solo los tokens de @theme en src/index.css, y cada par de
// colores que se lee aparece abajo para la prueba de contraste.

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

/** Acción del paso actual. Una por tarjeta o por pantalla. */
export const boton =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-institucional px-4 py-2 text-sm font-semibold " +
  `text-sobre-institucional hover:bg-institucional-hondo ${foco} ` +
  "disabled:cursor-not-allowed disabled:bg-pendiente-fondo disabled:text-tinta-suave";

/** Las demás acciones, con el mismo azul en el texto y el borde. */
export const botonSecundario =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-institucional bg-superficie px-4 py-2 " +
  `text-sm font-semibold text-institucional hover:bg-espera-fondo ${foco} ` +
  "disabled:cursor-not-allowed disabled:border-linea disabled:text-tinta-suave";

export const campo =
  "mt-1 block w-full rounded-md border border-borde-campo bg-superficie px-3 py-2 text-sm text-tinta " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";

/** Superficie blanca de una tarjeta o de un formulario sobre el papel. */
export const tarjeta = "rounded-tarjeta border border-linea bg-superficie p-tarjeta";

/**
 * Pares de texto y fondo que usan las pantallas. Cada uno tiene al menos 4,5 a 1 (AA del texto normal), y la prueba de
 * contraste falla si una clase de src escribe junto un texto y un fondo que no están aquí.
 */
export const paresDeTexto: ReadonlyArray<readonly [texto: string, fondo: string]> = [
  ["tinta", "papel"],
  ["tinta", "superficie"],
  ["tinta-suave", "papel"],
  ["tinta-suave", "superficie"],
  ["tinta-suave", "pendiente-fondo"],
  ["tinta", "pendiente-fondo"],
  ["institucional", "papel"],
  ["institucional", "superficie"],
  ["institucional", "espera-fondo"],
  ["tinta", "espera-fondo"],
  ["tinta", "ahora-fondo"],
  ["sobre-institucional", "institucional"],
  ["sobre-institucional", "institucional-hondo"],
  ["ahora-texto", "ahora-fondo"],
  ["hecho-texto", "hecho-fondo"],
  ["corregir-texto", "corregir-fondo"],
  ["pendiente-texto", "pendiente-fondo"],
  ["error-texto", "error-fondo"],
  ["aviso-texto", "aviso-fondo"],
  ["confirmacion-texto", "confirmacion-fondo"],
];

/** Bordes, anillo de foco y marcas del camino contra su fondo. Cada uno tiene al menos 3 a 1 (AA de componentes). */
export const paresDeComponente: ReadonlyArray<readonly [marca: string, fondo: string]> = [
  ["borde-campo", "superficie"],
  ["borde-campo", "papel"],
  ["foco", "superficie"],
  ["foco", "papel"],
  ["institucional", "superficie"],
  ["ocre", "superficie"],
  ["ocre", "papel"],
  ["hecho-texto", "superficie"],
  ["error-borde", "superficie"],
  ["error-borde", "error-fondo"],
  ["aviso-borde", "superficie"],
  ["confirmacion-borde", "confirmacion-fondo"],
];
