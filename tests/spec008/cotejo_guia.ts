// Cotejo de la guía de la capacitación con el código del Front (US-87 de la spec 008 del Back, FR-024, T049).
//
// La guía cita entre comillas latinas solo los textos que se ven en la pantalla. El cotejo acepta una cita cuando
// aparece en un texto del código de src/, leído con el analizador de Vite y no como texto plano, así que un comentario
// no cuenta como prueba de que un rótulo existe. Un texto del código es un literal, una plantilla con sus variables o
// el contenido de un elemento JSX, con sus expresiones. Las variables valen cualquier texto, siempre que la parte fija
// del código ponga al menos la mitad de las letras de la cita, para que una plantilla como `${codigo} ${nombre}` no
// acepte cualquier rótulo. Un mensaje de la API, que termina en punto o en signo de pregunta, se acepta también si
// coincide con un mensaje entre comillas latinas del contrato, con cualquier número en lugar de los del ejemplo. Un
// botón o un título, que no terminan en punto, se buscan solo en src/.
import { parseAst } from "vite";

export const COMODIN = Symbol("comodín");
type Segmento = string | typeof COMODIN;
export type Pieza = readonly Segmento[];

export interface Cita {
  rotulo: string;
  linea: number;
}

export const RUTA_DE_LA_GUIA = "docs/capacitacion/guia_quimica.md";

const LETRA = /[\p{L}\p{N}]/u;

const espacios = (texto: string) => texto.replace(/\s+/g, " ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Nodo = any;

/** Segmentos de una expresión de texto, o null si la expresión no arma texto. */
function patron(nodo: Nodo): Segmento[] | null {
  if (!nodo || typeof nodo !== "object") return null;
  switch (nodo.type) {
    case "Literal":
      return typeof nodo.value === "string" ? [nodo.value] : null;
    case "TemplateLiteral": {
      const segmentos: Segmento[] = [];
      nodo.quasis.forEach((q: Nodo, i: number) => {
        segmentos.push(q.value.cooked ?? q.value.raw);
        if (i < nodo.expressions.length) segmentos.push(COMODIN);
      });
      return segmentos;
    }
    case "BinaryExpression": {
      if (nodo.operator !== "+") return null;
      const izquierda = patron(nodo.left);
      const derecha = patron(nodo.right);
      if (!izquierda && !derecha) return null;
      return [...(izquierda ?? [COMODIN]), ...(derecha ?? [COMODIN])];
    }
    case "ParenthesizedExpression":
      return patron(nodo.expression);
    default:
      return null;
  }
}

/** Segmentos del contenido de un elemento JSX. Un elemento hijo o una expresión que no arma texto valen un comodín. */
function hijosJsx(nodo: Nodo): Segmento[] {
  const segmentos: Segmento[] = [];
  for (const hijo of nodo.children ?? []) {
    if (hijo.type === "JSXText") segmentos.push(hijo.value);
    else if (hijo.type === "JSXExpressionContainer") {
      if (hijo.expression.type === "JSXEmptyExpression") continue;
      segmentos.push(...(patron(hijo.expression) ?? [COMODIN]));
    } else segmentos.push(COMODIN);
  }
  return segmentos;
}

/** Une los textos contiguos, junta los espacios y los comodines seguidos y recorta los extremos. */
function normalizar(segmentos: Segmento[]): Pieza | null {
  const unidos: Segmento[] = [];
  for (const s of segmentos) {
    const ultimo = unidos[unidos.length - 1];
    if (s === COMODIN) {
      if (ultimo !== COMODIN) unidos.push(COMODIN);
    } else if (typeof ultimo === "string") unidos[unidos.length - 1] = ultimo + s;
    else unidos.push(s);
  }
  const limpios = unidos.map((s) => (s === COMODIN ? s : espacios(s)));
  if (typeof limpios[0] === "string") limpios[0] = limpios[0].trimStart();
  const fin = limpios.length - 1;
  if (typeof limpios[fin] === "string") limpios[fin] = (limpios[fin] as string).trimEnd();
  const pieza = limpios.filter((s) => s === COMODIN || s.length > 0);
  return pieza.some((s) => typeof s === "string" && LETRA.test(s)) ? pieza : null;
}

function recorrer(nodo: Nodo, piezas: Pieza[]) {
  if (Array.isArray(nodo)) {
    for (const n of nodo) recorrer(n, piezas);
    return;
  }
  if (!nodo || typeof nodo !== "object") return;
  if (typeof nodo.type === "string") {
    const segmentos = nodo.type === "JSXElement" || nodo.type === "JSXFragment" ? hijosJsx(nodo) : patron(nodo);
    const pieza = segmentos && normalizar(segmentos);
    if (pieza) piezas.push(pieza);
  }
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave !== "parent" && valor && typeof valor === "object") recorrer(valor, piezas);
  }
}

/** Los textos de cada archivo de src/, por su nombre, sin los comentarios. */
export function piezasDeFuentes(fuentes: Record<string, string>): Pieza[] {
  const piezas: Pieza[] = [];
  for (const [nombre, codigo] of Object.entries(fuentes)) {
    const ast = parseAst(codigo, { lang: nombre.endsWith(".tsx") ? "tsx" : "ts" });
    recorrer(ast, piezas);
  }
  return piezas;
}

/** Cada texto entre comillas latinas de la guía, con su línea, que empieza en 1. */
export function citasDeLaGuia(guia: string): Cita[] {
  return guia.split("\n").flatMap((texto, i) =>
    Array.from(texto.matchAll(/«([^«»]+)»/g), (m) => ({ rotulo: espacios(m[1]).trim(), linea: i + 1 })),
  );
}

/** Verdadero si la cita aparece dentro del texto sin cortar una palabra o un número. */
function enLimites(texto: string, cita: string): boolean {
  for (let i = texto.indexOf(cita); i >= 0; i = texto.indexOf(cita, i + 1)) {
    const antes = texto[i - 1];
    const despues = texto[i + cita.length];
    if ((!antes || !LETRA.test(antes)) && (!despues || !LETRA.test(despues))) return true;
  }
  return false;
}

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const letras = (texto: string) => (texto.match(/\p{L}/gu) ?? []).length;

function apareceEnPieza(cita: string, pieza: Pieza): boolean {
  if (pieza.some((s) => typeof s === "string" && enLimites(s, cita))) return true;
  if (!pieza.includes(COMODIN)) return false;
  const fijas = pieza.reduce((n, s) => n + (typeof s === "string" ? letras(s) : 0), 0);
  if (fijas * 2 < letras(cita)) return false;
  const expresion = pieza.map((s) => (s === COMODIN ? ".+?" : escapar(s))).join("");
  return new RegExp(`^${expresion}$`, "u").test(cita);
}

const sinNumeros = (texto: string) => texto.replace(/\d+/g, "#");

/** Mensajes entre comillas latinas del contrato, con cada número reemplazado por «#». */
export function mensajesDelContrato(contrato: string): string[] {
  return Array.from(contrato.matchAll(/«([^«»]+)»/g), (m) => sinNumeros(espacios(m[1]).trim()));
}

/** Las citas de la guía que no aparecen en src/ ni, si son mensajes, en el contrato. */
export function cotejar(guia: string, piezas: readonly Pieza[], contrato: string): Cita[] {
  const mensajes = mensajesDelContrato(contrato);
  return citasDeLaGuia(guia).filter(({ rotulo }) => {
    if (piezas.some((p) => apareceEnPieza(rotulo, p))) return false;
    if (/[.?]$/.test(rotulo)) {
      const buscado = sinNumeros(rotulo);
      if (mensajes.some((m) => enLimites(m, buscado))) return false;
    }
    return true;
  });
}

/** Falla con cada cita que falta y la línea de la guía que la trae. */
export function comprobarGuia(guia: string, piezas: readonly Pieza[], contrato: string): void {
  const faltan = cotejar(guia, piezas, contrato);
  if (faltan.length === 0) return;
  const lineas = faltan.map(({ rotulo, linea }) => `«${rotulo}» en la línea ${linea} de ${RUTA_DE_LA_GUIA}`);
  throw new Error(`La guía cita textos que el Front no tiene.\n${lineas.join("\n")}`);
}

/** El texto de la guía que va antes del primer título de nivel 2. */
export function portada(guia: string): string {
  const fin = guia.search(/^## /m);
  return fin < 0 ? guia : guia.slice(0, fin);
}

/** El texto de la primera sección de nivel 2 cuyo título cumple la expresión, sin el título. */
export function seccion(guia: string, titulo: RegExp): string {
  const lineas = guia.split("\n");
  const inicio = lineas.findIndex((l) => l.startsWith("## ") && titulo.test(l));
  if (inicio < 0) return "";
  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => l.startsWith("## "));
  return (fin < 0 ? resto : resto.slice(0, fin)).join("\n");
}
