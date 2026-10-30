import { expect, test, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// Prueba de humo de P1 a P4 con la API real sobre un clúster desechable (api_local.sh).
// Las contraseñas se leen del archivo temporal que imprime api_local.sh (ABET_CLAVES_ARCHIVO,
// líneas "correo clave"); nunca se escriben en el repositorio ni en las capturas. Datos inventados.
// Necesita una API recién arrancada, porque la carga de la 410 se hace una sola vez (la huella repetida
// responde 200 y no recorre P4 con el rechazo).
const ARCHIVO_CLAVES = process.env.ABET_CLAVES_ARCHIVO ?? "";
const EXPORT_CON_ERROR =
  process.env.EXPORT_CON_ERROR ?? path.resolve(AQUI, "../../back/tests/datos_inventados/export_inventado_410_con_error.xlsx");
const CAPTURAS = process.env.DIR_CAPTURAS ?? "";

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

async function ingresar(page: Page, correo: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ingreso" })).toBeVisible();
  if (correo.startsWith("docente410")) await capturar(page, "P1_ingreso.png");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave(correo));
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis secciones" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

let seccion410 = "";

test.beforeAll(() => {
  expect(ARCHIVO_CLAVES, "falta ABET_CLAVES_ARCHIVO").not.toBe("");
});

test("docente410 recorre P1, P2, P3 y P4", async ({ page }) => {
  await ingresar(page, "docente410@example.invalid");

  // P2. La 410 de 450002, sin carga todavía.
  const tarjeta = page.getByRole("listitem").filter({ hasText: "450002" });
  await expect(tarjeta).toHaveCount(1);
  await expect(tarjeta).toContainText("410");
  await expect(tarjeta).toContainText("5.3");
  await capturar(page, "P2_mis_secciones_docente410.png");

  const respuesta = await page.request.get("/api/secciones");
  expect(respuesta.status()).toBe(200);
  const lista = (await respuesta.json()) as { seccion_id: string; numero: string; curso_codigo?: string }[];
  expect(lista).toHaveLength(1);
  seccion410 = String(lista[0].seccion_id);

  // P3. Subida del export con el 5 en la fila 3.
  await tarjeta.getByRole("button", { name: "Subir export" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();
  await page.locator("#archivo").setInputFiles(EXPORT_CON_ERROR);
  await capturar(page, "P3_subir_export.png");
  await page.getByRole("button", { name: "Subir", exact: true }).click();

  // P4. 11 leídas, 10 aceptadas, 1 rechazada, el rechazo de la fila 3 y el aviso de 5.3.
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeVisible();

  const rechazos = page.getByRole("region", { name: "Rechazos" });
  await expect(rechazos).toContainText("Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.");
  const avisos = page.getByRole("region", { name: "Avisos" });
  await expect(avisos).toContainText("PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.");
  await capturar(page, "P4_resultado_con_rechazo_y_aviso.png");

  // Descarga del R-17.
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar R-17" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^R017_450002_410_2026-2.*\.xlsx$/);
  const ruta = await archivo.path();
  expect(readFileSync(ruta).subarray(0, 2).toString()).toBe("PK");
});

test("docente.varias ve sus tres secciones y recibe 403 en la 410", async ({ page }) => {
  await ingresar(page, "docente.varias@example.invalid");
  await expect(page.getByRole("listitem").filter({ hasText: "Subir export" })).toHaveCount(3);
  await capturar(page, "P2_mis_secciones_docente_varias.png");

  expect(seccion410).not.toBe("");
  const r = await page.request.post(`/api/secciones/${seccion410}/cargas`, {
    multipart: {
      archivo: { name: "x.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(EXPORT_CON_ERROR) },
    },
  });
  expect(r.status()).toBe(403);
  expect(await r.json()).toEqual({ detail: "La sección no está a su cargo." });
});
