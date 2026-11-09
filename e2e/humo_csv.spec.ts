import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// Prueba de humo de los exports de texto de Blackboard (spec 003, T042 y T076, US-27, US-28, US-33 y US-34) con la
// API real sobre un clúster desechable o contra la vista previa de develop. docente410 sube el .csv de la 410 y
// docente411 el .xls de texto de la 411. Las contraseñas se leen del archivo temporal que imprime api_local.sh o
// herramientas_neon/asignar_claves.py (ABET_CLAVES_ARCHIVO, líneas "correo clave"); nunca se escriben en el repositorio
// ni en las capturas. Datos inventados. Necesita una API recién arrancada y sin la carga de humo.spec.ts, porque cada
// sección admite una sola carga publicada (otra huella responde 409).
const ARCHIVO_CLAVES = process.env.ABET_CLAVES_ARCHIVO ?? "";
const EXPORT_CSV =
  process.env.EXPORT_CSV_410 ??
  path.resolve(AQUI, "../../back/tests/datos_inventados/gc_SINTETICO_20262_450002_410_fullgc_2026-11-04-14-35-59.csv");
const EXPORT_XLS =
  process.env.EXPORT_XLS_411 ??
  path.resolve(AQUI, "../../back/tests/datos_inventados/gc_SINTETICO_20262_450002_411_fullgc_2026-11-04-14-40-10.xls");
const CAPTURAS = process.env.DIR_CAPTURAS ?? "";
const VISTA_PREVIA = (process.env.URL_FRONT ?? "").startsWith("https://");
// La clave de omisión de la protección de Vercel va solo en las peticiones del navegador, por context.route.
const OMISION = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

function clave(correo: string): string {
  const linea = readFileSync(ARCHIVO_CLAVES, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${correo} `));
  if (!linea) throw new Error(`Sin contraseña para el usuario de prueba ${correo}`);
  return linea.slice(correo.length + 1).trim();
}

async function capturar(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURAS, nombre), fullPage: true });
}

test.beforeEach(async ({ context }) => {
  if (!VISTA_PREVIA || !OMISION) return;
  const origen = new URL(process.env.URL_FRONT ?? "").origin;
  await context.route(`${origen}/**`, (ruta) =>
    ruta.continue({
      headers: { ...ruta.request().headers(), "x-vercel-protection-bypass": OMISION, "x-vercel-set-bypass-cookie": "true" },
    }),
  );
});

test.beforeAll(() => {
  expect(ARCHIVO_CLAVES, "falta ABET_CLAVES_ARCHIVO").not.toBe("");
});

async function subirExportDeTexto(page: Page, correo: string, archivo: string, nombre: string) {
  await page.goto("/");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave(correo));
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis secciones" })).toBeVisible();

  const tarjeta = page.getByRole("listitem").filter({ hasText: "450002" });
  await expect(tarjeta).toHaveCount(1);
  await tarjeta.getByRole("button", { name: "Subir export" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();

  // P3. El selector admite el .csv y el .xls (US-33).
  await expect(page.locator("#archivo")).toHaveAttribute("accept", ".xlsx,.csv,.xls");
  await page.locator("#archivo").setInputFiles(archivo);
  await capturar(page, `P3_subir_${nombre}.png`);
  await page.getByRole("button", { name: "Subir", exact: true }).click();
}

test("docente410 sube el .csv inventado de la 410 y ve P4 sin hoja y el R-17", async ({ page }) => {
  await subirExportDeTexto(page, "docente410@example.invalid", EXPORT_CSV, "csv_410");

  // P4. Publicada, 11 de 11 filas aceptadas y una constancia sin hoja (US-34).
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("Publicada", { exact: true })).toBeVisible();
  await expect(page.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeVisible();
  await expect(page.getByRole("region", { name: "Constancia" })).toContainText("Sin hoja (export de texto)");
  await capturar(page, "P4_resultado_csv_410.png");

  // Descarga del R-17.
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar R-17" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^R017_450002_410_2026-2.*\.xlsx$/);
  expect(readFileSync(await archivo.path()).subarray(0, 2).toString()).toBe("PK");
});

test("docente411 sube el .xls de texto inventado de la 411 y ve P4 sin hoja y el R-17", async ({ page }) => {
  await subirExportDeTexto(page, "docente411@example.invalid", EXPORT_XLS, "xls_411");

  // P4. Publicada, 11 de 11 filas aceptadas y una constancia sin hoja (US-28 y US-34).
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("Publicada", { exact: true })).toBeVisible();
  await expect(page.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeVisible();
  await expect(page.getByRole("region", { name: "Constancia" })).toContainText("Sin hoja (export de texto)");
  await capturar(page, "P4_resultado_xls_411.png");

  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar R-17" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^R017_450002_411_2026-2.*\.xlsx$/);
  expect(readFileSync(await archivo.path()).subarray(0, 2).toString()).toBe("PK");
});
