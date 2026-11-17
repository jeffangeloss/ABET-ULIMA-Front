import { expect, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ayudas comunes de las pruebas de humo (e2e/humo.spec.ts y e2e/humo_csv.spec.ts). Las contraseñas se leen del
// archivo temporal de ABET_CLAVES_ARCHIVO (líneas "correo clave") que imprimen api_local.sh del Back o
// herramientas_neon/asignar_claves.py; nunca se escriben en el repositorio ni en las capturas. Datos inventados.
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

/** P1. Ingresa con la contraseña del archivo de claves y espera P2 «Mis secciones». */
export async function ingresar(page: Page, correo: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ingreso" })).toBeVisible();
  if (correo.startsWith("docente410")) await capturar(page, "P1_ingreso.png");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave(correo));
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis secciones" })).toBeVisible();
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
