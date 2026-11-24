import { expect, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ayudas comunes de las pruebas de humo (e2e/humo.spec.ts, e2e/humo_csv.spec.ts y e2e/humo_quimica.spec.ts). Las
// contraseñas se leen del archivo temporal de ABET_CLAVES_ARCHIVO (líneas "correo clave") que imprimen api_local.sh del
// Back o herramientas_neon/asignar_claves.py; nunca se escriben en el repositorio ni en las capturas. Datos inventados.
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const ARCHIVO_CLAVES = process.env.ABET_CLAVES_ARCHIVO ?? "";
const CAPTURAS = process.env.DIR_CAPTURAS ?? "";
// Contra una vista previa de Vercel, URL_FRONT empieza con https (T075 y T076 de la spec 003).
export const VISTA_PREVIA = (process.env.URL_FRONT ?? "").startsWith("https://");
// La clave de omisión de la protección de Vercel va solo en las peticiones del navegador, por context.route, que el
// registro de llamadas de page.request no muestra. Su respuesta deja la cookie de omisión, que también usa page.request.
const OMISION = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

/** Ruta de un export inventado del Back: la de la variable de entorno o la de tests/datos_inventados/ junto al Front. */
export function exportInventado(variable: string, nombre: string): string {
  return process.env[variable] ?? path.resolve(AQUI, "../../back/tests/datos_inventados", nombre);
}

export function clave(correo: string): string {
  const linea = readFileSync(ARCHIVO_CLAVES, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${correo} `));
  if (!linea) throw new Error(`Sin contraseña para el usuario de prueba ${correo}`);
  return linea.slice(correo.length + 1).trim();
}

export async function capturar(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURAS, nombre), fullPage: true });
}

/**
 * P1. Ingresa con la contraseña del archivo de claves y espera la pantalla de llegada, P2 «Mis secciones» por omisión.
 * Spec 008 (T053). La coordinación del curso llega a P7 o, sin la etapa B, a P2 «Secciones del curso».
 */
export async function ingresar(page: Page, correo: string, llegada: string | RegExp = "Mis secciones") {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ingreso" })).toBeVisible();
  if (correo.startsWith("docente410")) await capturar(page, "P1_ingreso.png");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave(correo));
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: llegada })).toBeVisible();
}

/**
 * Spec 008 (T053). Cabeceras de omisión para un contexto de peticiones sin navegador (request.newContext), que
 * context.route no alcanza. Vacías fuera de una vista previa o sin la clave.
 */
export function cabecerasDeOmision(): Record<string, string> {
  return VISTA_PREVIA && OMISION ? { "x-vercel-protection-bypass": OMISION, "x-vercel-set-bypass-cookie": "true" } : {};
}

/** Agrega la clave de omisión a las peticiones del navegador hacia la vista previa, si la hay. */
export async function omitirProteccion(context: BrowserContext) {
  if (!VISTA_PREVIA || !OMISION) return;
  const origen = new URL(process.env.URL_FRONT ?? "").origin;
  await context.route(`${origen}/**`, (ruta) =>
    ruta.continue({
      headers: { ...ruta.request().headers(), "x-vercel-protection-bypass": OMISION, "x-vercel-set-bypass-cookie": "true" },
    }),
  );
}

// Spec 004 (T043). Lectura mínima de celdas del R-17 descargado, sin una dependencia nueva, para comparar P6 con el libro.

function partesDelZip(datos: Buffer): Map<string, Buffer> {
  let fin = datos.length - 22;
  while (fin >= 0 && datos.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error("El R-17 descargado no es un zip");
  const partes = new Map<string, Buffer>();
  let p = datos.readUInt32LE(fin + 16);
  for (let i = 0; i < datos.readUInt16LE(fin + 10); i++) {
    if (datos.readUInt32LE(p) !== 0x02014b50) throw new Error("El directorio del zip del R-17 está dañado");
    const metodo = datos.readUInt16LE(p + 10);
    const comprimido = datos.readUInt32LE(p + 20);
    const [largoNombre, largoExtra, largoComentario] = [28, 30, 32].map((d) => datos.readUInt16LE(p + d));
    const local = datos.readUInt32LE(p + 42);
    const nombre = datos.subarray(p + 46, p + 46 + largoNombre).toString("utf8");
    const inicio = local + 30 + datos.readUInt16LE(local + 26) + datos.readUInt16LE(local + 28);
    const crudo = datos.subarray(inicio, inicio + comprimido);
    partes.set(nombre, metodo === 8 ? inflateRawSync(crudo) : crudo);
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return partes;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function textoXml(xml: string): string {
  const unido = [...xml.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => m[1]).join("");
  return unido.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTIDADES[e]);
}

function atributo(etiqueta: string, nombre: string): string | undefined {
  return new RegExp(`\\s${nombre}="([^"]*)"`).exec(etiqueta)?.[1];
}

/** Valor de texto de cada celda pedida de una hoja del libro, con las cadenas compartidas resueltas. */
export function celdasDelLibro(datos: Buffer, hoja: string, celdas: string[]): Record<string, string | null> {
  const partes = partesDelZip(datos);
  const leer = (nombre: string) => partes.get(nombre)?.toString("utf8") ?? "";
  const etiqueta = [...leer("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((e) => atributo(e, "name") === hoja);
  if (!etiqueta) throw new Error(`El R-17 no tiene la hoja ${hoja}`);
  const id = atributo(etiqueta, "r:id");
  const relacion = [...leer("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((e) => atributo(e, "Id") === id);
  const destino = (atributo(relacion ?? "", "Target") ?? "").replace(/^\/?(xl\/)?/, "");
  const compartidas = [...leer("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoXml(m[1]));
  const xml = leer(`xl/${destino}`);
  const valores: Record<string, string | null> = {};
  for (const celda of celdas) {
    const c = new RegExp(`<c\\b[^>]*\\sr="${celda}"[^>]*?(?:/>|>([\\s\\S]*?)</c>)`).exec(xml);
    const tipo = c ? atributo(c[0], "t") : undefined;
    const v = c?.[1] ? /<v>([^<]*)<\/v>/.exec(c[1])?.[1] : undefined;
    valores[celda] = !c || (v === undefined && tipo !== "inlineStr") ? null
      : tipo === "s" ? compartidas[Number(v)]
      : tipo === "inlineStr" ? textoXml(c[1] ?? "")
      : v ?? null;
  }
  return valores;
}

/**
 * Spec 008 (T053). Cada celda con valor de una hoja del libro, por su referencia, para comparar dos R-17 celda por celda.
 */
export function todasLasCeldas(datos: Buffer, hoja: string): Record<string, string | null> {
  const partes = partesDelZip(datos);
  const leer = (nombre: string) => partes.get(nombre)?.toString("utf8") ?? "";
  const etiqueta = [...leer("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((e) => atributo(e, "name") === hoja);
  const id = atributo(etiqueta ?? "", "r:id");
  const relacion = [...leer("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((e) => atributo(e, "Id") === id);
  const destino = (atributo(relacion ?? "", "Target") ?? "").replace(/^\/?(xl\/)?/, "");
  const referencias = [...leer(`xl/${destino}`).matchAll(/<c\b[^>]*\sr="([A-Z]+[0-9]+)"/g)].map((m) => m[1]);
  return celdasDelLibro(datos, hoja, referencias);
}

/** «81,8 %», como escribe P6 el porcentaje de un decimal. */
export function porcentajeDeP6(valor: number): string {
  return `${valor.toFixed(1).replace(".", ",")} %`;
}
