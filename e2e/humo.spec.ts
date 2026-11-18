import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ARCHIVO_CLAVES,
  VISTA_PREVIA,
  capturar,
  celdasDelLibro,
  exportInventado,
  ingresar,
  omitirProteccion,
  porcentajeDeP6,
} from "./comun";

// Prueba de humo de P1 a P4 con la API real sobre un clúster desechable (api_local.sh) o contra la vista previa de
// develop. Las contraseñas se leen de ABET_CLAVES_ARCHIVO (e2e/comun.ts). Datos inventados. Necesita una API recién
// arrancada, porque la carga de la 410 se hace una sola vez (la huella repetida responde 200 y no recorre P4 con el
// rechazo).
const EXPORT_CON_ERROR = exportInventado("EXPORT_CON_ERROR", "export_inventado_410_con_error.xlsx");
// Corte 2 (T085). El export correcto de la 410 reemplaza a la carga con el error del primer test.
const EXPORT_CORRECTO = exportInventado("EXPORT_CORRECTO", "sintetico_20262_450002_410.xlsx");
const DIR_CAPTURAS = process.env.DIR_CAPTURAS ?? "";
// Contra una vista previa de Vercel (T075), la base de Neon no tiene a docente.varias, así que el caso del 403 lo hace
// docente411, que tampoco tiene la 410 a su cargo.
const AJENO = VISTA_PREVIA
  ? { correo: "docente411@example.invalid", secciones: 1, captura: "P2_mis_secciones_docente411.png" }
  : { correo: "docente.varias@example.invalid", secciones: 3, captura: "P2_mis_secciones_docente_varias.png" };

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await omitirProteccion(context);
});

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

test(`${AJENO.correo} ve solo sus secciones y recibe 403 en la 410`, async ({ page }) => {
  await ingresar(page, AJENO.correo);
  await expect(page.getByRole("listitem").filter({ hasText: "Subir export" })).toHaveCount(AJENO.secciones);
  await capturar(page, AJENO.captura);

  expect(seccion410).not.toBe("");
  const r = await page.request.post(`/api/secciones/${seccion410}/cargas`, {
    multipart: {
      archivo: { name: "x.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(EXPORT_CON_ERROR) },
    },
  });
  expect(r.status()).toBe(403);
  expect(await r.json()).toEqual({ detail: "La sección no está a su cargo." });
});

test("docente410 reemplaza en P5 la carga con error por el export correcto", async ({ page }) => {
  await ingresar(page, "docente410@example.invalid");

  // P5. La 410 de 450002 tiene vigente la carga con error que subió el primer test.
  const cabecera = page.getByRole("banner");
  await cabecera.getByRole("button", { name: "Cargas", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cargas" })).toBeVisible();
  const seccion = page.getByRole("region").filter({ hasText: /450002 .*sección 410, / });
  await expect(seccion).toHaveCount(1);
  const vigente = seccion.getByRole("listitem").filter({ hasText: "Vigente" });
  await expect(vigente).toHaveCount(1);
  await vigente.getByRole("button", { name: "Reemplazar carga" }).click();

  // P3 en modo reemplazo, con el export correcto.
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();
  await expect(page.getByText(/^Reemplaza a la carga \d+, la publicada de esta sección\.$/)).toBeVisible();
  await page.locator("#archivo").setInputFiles(EXPORT_CORRECTO);
  await page.getByRole("button", { name: "Subir", exact: true }).click();

  // P4. La carga nueva, sin rechazos.
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeVisible();

  // R-17 de la carga nueva.
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar R-17" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^R017_450002_410_2026-2.*\.xlsx$/);
  expect(readFileSync(await archivo.path()).subarray(0, 2).toString()).toBe("PK");
  // Con el nombre que fija la API, porque herramientas_neon/revisar_r17.py coteja su sufijo _PROVISIONAL con el título.
  if (DIR_CAPTURAS) {
    const carpeta = path.join(DIR_CAPTURAS, "reemplazo");
    mkdirSync(carpeta, { recursive: true });
    await archivo.saveAs(path.join(carpeta, archivo.suggestedFilename()));
  }

  // P5 otra vez, con la carga nueva vigente y la anterior reemplazada.
  await cabecera.getByRole("button", { name: "Cargas", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cargas" })).toBeVisible();
  await expect(seccion.getByText(/^Vigente, reemplaza a la carga \d+$/)).toBeVisible();
  await expect(seccion.getByText(/^Reemplazada por la carga \d+$/)).toBeVisible();
  await capturar(page, "P5_cargas_reemplazo.png");
});

// Spec 004 (T043). P6 muestra las cifras del R-17 de la carga vigente de la 410, la del reemplazo del test anterior, y el
// profesor ajeno no ve la 410 en su P6. En la vista previa el ajeno es docente411, porque docente.varias no existe en Neon.
const BLOQUE_II = [24, 25, 26];
const LOGRADO = "¡Felicidades! Logró alcanzar el indicador. Lo animamos a seguir mejorando con nuevas iniciativas.";

test("docente410 ve en P6 las cifras del R-17 de su carga de la 410", async ({ page }) => {
  await ingresar(page, "docente410@example.invalid");
  await page.getByRole("banner").getByRole("button", { name: "Ver mis logros por SO" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeVisible();
  const secciones = page.getByRole("region", { name: "Secciones" });
  const enlace = secciones.getByRole("link", { name: "Descargar R-17 de la sección 410 de 450002" });
  await expect(enlace).toBeVisible();
  const destino = (await enlace.getAttribute("href")) ?? "";
  expect(destino).toMatch(/^\/api\/cargas\/\d+\/r17\.xlsx$/);
  await expect(secciones).toContainText("Resultados provisionales.");

  // El R-17 de esa misma carga, con el bloque II en B24:H26 de la hoja «Cursos de Carrera».
  const libro = await page.request.get(destino);
  expect(libro.status()).toBe(200);
  const celdas = celdasDelLibro(
    Buffer.from(await libro.body()),
    "Cursos de Carrera",
    BLOQUE_II.flatMap((f) => [`B${f}`, `E${f}`, `G${f}`, `H${f}`]),
  );
  const so5 = page.getByRole("region", { name: "SO 5" });
  for (const fila of BLOQUE_II) {
    const pi = celdas[`B${fila}`];
    expect(pi, `B${fila}`).toMatch(/^5\.\d+$/);
    const logro = Math.round(1000 * Number(celdas[`E${fila}`])) / 10;
    const metaDelLibro = Math.round(1000 * Number(celdas[`G${fila}`])) / 10;
    const estado = celdas[`H${fila}`] === LOGRADO ? "En la meta" : "Debajo de la meta";
    const enP6 = so5.getByRole("listitem").filter({ hasText: `${pi} · Sección 410 de 450002 · ` });
    await expect(enP6).toHaveCount(1);
    await expect(enP6.locator("p").first()).toHaveText(
      new RegExp(`^${pi!.replace(".", "\\.")} · Sección 410 de 450002 · ${porcentajeDeP6(logro)} \\(\\d+ de \\d+\\) · ${estado}$`),
    );
    await expect(enP6).toContainText(`Meta ${metaDelLibro.toFixed(0)} %`);
  }
  await capturar(page, "P6_mis_logros_docente410.png");
});

test(`${AJENO.correo} no ve la 410 en su P6`, async ({ page }) => {
  await ingresar(page, AJENO.correo);
  await page.getByRole("banner").getByRole("button", { name: "Ver mis logros por SO" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeVisible();
  const secciones = page.getByRole("region", { name: "Secciones" });
  await expect(secciones).toBeVisible();
  await expect(secciones.getByRole("listitem")).toHaveCount(AJENO.secciones);
  await expect(page.getByRole("main")).not.toContainText("Sección 410 de 450002");
  const respuesta = await page.request.get("/api/resultados");
  expect(respuesta.status()).toBe(200);
  const cuerpo = (await respuesta.json()) as { secciones: { seccion_id: number; numero: string; asignatura: { codigo: string } }[] };
  expect(cuerpo.secciones.map((s) => String(s.seccion_id))).not.toContain(seccion410);
  expect(cuerpo.secciones.some((s) => s.numero === "410" && s.asignatura.codigo === "450002")).toBe(false);
  await capturar(page, AJENO.captura.replace("P2_mis_secciones", "P6_mis_logros"));
});
