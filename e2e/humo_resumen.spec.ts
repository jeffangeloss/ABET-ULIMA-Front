import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARCHIVO_CLAVES, capturar, clave, ingresar, omitirProteccion } from "./comun";

// Humo de P8 «Resumen del curso» (spec 009, T033, US-92), con el escenario @playwright de pantalla_resumen_del_curso.feature
// y su cifra contra el generador del humo de la spec 008. Escrito y sin correr contra la vista previa, porque necesita las
// contraseñas que solo asigna Jefferson. Corre después de e2e/humo_quimica.spec.ts y sobre la misma siembra inventada, con
//   bash scripts/e2e.sh e2e/humo_resumen.spec.ts
// y las variables de e2e/humo_quimica.spec.ts, URL_FRONT, ABET_CLAVES_ARCHIVO (líneas «correo clave» de la coordinación y de
// docente701) y EXPORTS_QUIMICA (la carpeta del generador de US-74 con su manifiesto.json). Solo lee, no sube nada.
//
// Las cifras esperadas salen del manifiesto del generador, que cuenta por sección los niveles 1 a 4 sin códigos ni nombres.
// Una sección con carga publicada se compara con su conteo, y el curso con la suma de esas secciones, de modo que la prueba
// vale con las secciones que el humo anterior dejó publicadas, que son la 701 y la 702, o con cualquier otro subconjunto
// que tenga al menos una. Con ninguna publicada, se detiene y pide correr antes el humo de Química.

const PERIODO = "2026-1";
const ASIGNATURA = "5643";
const COORDINACION = "coordinador.quimica@example.invalid";
const DOCENTE_701 = "docente701@example.invalid";
const EXPORTS = process.env.EXPORTS_QUIMICA ?? "";
const LLEGADA_COORDINACION = /^(Avance del registro del curso|Secciones del curso)$/;
const NIVEL_ESPERADO = 3;

interface Manifiesto {
  periodo: string;
  asignatura: string;
  exports: { seccion: string; niveles: Record<"1" | "2" | "3" | "4", number> }[];
}

function niveles(carpeta: string, seccion: string): number[] {
  const manifiesto = JSON.parse(readFileSync(path.join(carpeta, "manifiesto.json"), "utf8")) as Manifiesto;
  expect(manifiesto.periodo, "periodo del manifiesto").toBe(PERIODO);
  expect(manifiesto.asignatura, "asignatura del manifiesto").toBe(ASIGNATURA);
  const fila = manifiesto.exports.find((e) => e.seccion === seccion);
  if (!fila) throw new Error(`El manifiesto no trae la sección ${seccion}`);
  return [fila.niveles["1"], fila.niveles["2"], fila.niveles["3"], fila.niveles["4"]];
}

/** num entre den con `decimales` decimales, redondeado hacia arriba en la mitad como numeric de PostgreSQL, con coma. */
function redondeado(num: number, den: number, decimales: number): { texto: string; escalado: number } {
  const m = 10 ** decimales;
  const escalado = Math.floor((2 * num * m + den) / (2 * den));
  return { texto: (escalado / m).toFixed(decimales).replace(".", ","), escalado };
}

const cifras = (reparto: number[]) => {
  const calificados = reparto.reduce((a, b) => a + b, 0);
  const logrados = reparto.slice(NIVEL_ESPERADO - 1).reduce((a, b) => a + b, 0);
  const suma = reparto.reduce((a, n, i) => a + n * (i + 1), 0);
  return {
    calificados,
    logrados,
    pct: redondeado(logrados * 100, calificados, 1),
    promedio: redondeado(suma, calificados, 2),
  };
};

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await omitirProteccion(context);
});

test.beforeAll(() => {
  expect(ARCHIVO_CLAVES, "falta ABET_CLAVES_ARCHIVO").not.toBe("");
  expect(EXPORTS, "falta EXPORTS_QUIMICA, la carpeta del generador de US-74").not.toBe("");
});

test("La coordinación del curso abre «Resumen del curso» y ve las cifras del curso y una fila por sección", async ({ page }) => {
  await ingresar(page, COORDINACION, LLEGADA_COORDINACION);
  const menu = page.getByRole("navigation", { name: "Menú principal" });
  await menu.getByRole("button", { name: "Resumen del curso" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Resumen del curso" })).toBeVisible();
  await expect(page.getByText(`${ASIGNATURA} Química General, periodo ${PERIODO}`)).toBeVisible();
  await expect(menu.getByRole("button", { name: "Resumen del curso" })).toHaveAttribute("aria-current", "page");
  // La coordinación del curso alcanza un solo curso, así que P8 no ofrece el selector.
  await expect(page.getByRole("combobox", { name: "Curso" })).toHaveCount(0);

  // Una fila por sección, en orden de número, con la 704 sin carga.
  const tabla = page.getByRole("table", { name: "Secciones del PI 6.1" });
  await expect(tabla.getByRole("rowheader")).toHaveText(["701", "702", "703", "704"]);
  const fila = (numero: string) => tabla.getByRole("row").filter({ has: page.getByRole("rowheader", { name: numero, exact: true }) });
  await expect(fila("704")).toContainText("Sin carga publicada");

  const publicadas: string[] = [];
  for (const numero of ["701", "702", "703", "704"]) {
    if (!(await fila(numero).innerText()).includes("Sin carga publicada")) publicadas.push(numero);
  }
  expect(publicadas.length, "secciones con carga publicada. Corra antes e2e/humo_quimica.spec.ts").toBeGreaterThan(0);
  expect(publicadas).not.toContain("704");

  // La meta del conjunto de reglas, que P8 escribe en la barra de cada fila.
  const metaTexto = /Meta (\d+(?:,\d)?) %/.exec(await fila(publicadas[0]).innerText());
  expect(metaTexto, "«Meta N %» en la fila").not.toBeNull();
  const meta = Number(metaTexto![1].replace(",", "."));

  // Cada sección publicada escribe las cifras del generador, y su estado sigue la meta.
  const reparto: number[][] = [];
  for (const numero of publicadas) {
    const r = niveles(EXPORTS, numero);
    reparto.push(r);
    const c = cifras(r);
    const celdas = fila(numero).getByRole("cell");
    await expect(celdas.nth(0)).toHaveText(String(c.calificados));
    await expect(celdas.nth(1)).toContainText(`${c.pct.texto} % (${c.logrados} de ${c.calificados})`);
    await expect(celdas.nth(2)).toHaveText(c.promedio.texto);
    await expect(celdas.nth(3)).toHaveText(c.pct.escalado >= meta * 10 ? "En la meta" : "Debajo de la meta");
  }

  // El curso suma alumnos de las secciones publicadas, con el mismo redondeo, y no promedia porcentajes.
  const curso = cifras(publicadas.map((_, i) => reparto[i]).reduce((a, r) => a.map((n, j) => n + r[j]), [0, 0, 0, 0]));
  await expect(
    page.getByText(`${curso.logrados} de ${curso.calificados} alumnos en el nivel esperado o superior (${curso.pct.texto} %)`),
  ).toBeVisible();
  await expect(page.getByText(`Promedio de calificación ${curso.promedio.texto} de 4`)).toBeVisible();
  const enMeta = publicadas.filter((_, i) => cifras(reparto[i]).pct.escalado >= meta * 10).length;
  await expect(
    page.getByText(`${enMeta} de ${publicadas.length} ${publicadas.length === 1 ? "sección publicada" : "secciones publicadas"} en la meta`),
  ).toBeVisible();
  const sinCarga = 4 - publicadas.length;
  await expect(
    page.getByText(`${sinCarga} ${sinCarga === 1 ? "sección" : "secciones"} sin carga publicada`, { exact: true }),
  ).toBeVisible();

  // La barra de cada fila y la del curso son dibujos ocultos al lector de pantalla, y la 704 no dibuja una de 0 %.
  await expect(page.locator("[data-barra='curso']")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-barra='seccion']")).toHaveCount(publicadas.length);
  await expect(fila("704").locator("[data-barra]")).toHaveCount(0);

  // Ningún correo ni nombre de profesor en la página, fuera del correo de la cuenta que ingresó en la cabecera.
  const principal = await page.getByRole("main").innerText();
  expect(principal).not.toMatch(/@|example\.invalid/);
  expect(principal).not.toMatch(/profesor|docente/i);
  await capturar(page, "P8_coordinacion_quimica.png");
});

test("La ruta 20 trae solo su lista cerrada de claves y el profesor no la alcanza", async ({ page }) => {
  await ingresar(page, COORDINACION, LLEGADA_COORDINACION);
  const r = await page.request.get(`/api/resumen-curso?periodo=${PERIODO}&asignatura=${ASIGNATURA}`);
  expect(r.status()).toBe(200);
  const cuerpo = (await r.json()) as {
    indicadores: { curso: object; secciones: object[] }[];
  };
  expect(Object.keys(cuerpo).sort()).toEqual(["asignatura", "indicadores", "periodo"]);
  const indicador = cuerpo.indicadores[0];
  expect(Object.keys(indicador).sort()).toEqual(
    ["conteo_secciones", "curso", "meta_pct", "nivel_esperado", "pi", "provisional", "secciones", "so"],
  );
  expect(Object.keys(indicador.curso).sort()).toEqual(
    ["calificados", "en_meta", "estudiantes_por_nivel", "logrados", "pct_sobre_calificados", "promedio_nivel", "sin_evidencia", "total"],
  );
  expect(indicador.secciones).toHaveLength(4);
  expect(JSON.stringify(cuerpo)).not.toMatch(/@|subida_por|nombre_archivo|sha256/);
  await page.getByRole("banner").getByRole("button", { name: "Salir" }).click();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ingreso" })).toBeVisible();
  await page.getByLabel("Correo").fill(DOCENTE_701);
  await page.getByLabel("Contraseña").fill(clave(DOCENTE_701));
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis secciones" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Menú principal" }).getByRole("button", { name: "Resumen del curso" })).toHaveCount(0);
  const prohibida = await page.request.get(`/api/resumen-curso?periodo=${PERIODO}&asignatura=${ASIGNATURA}`);
  expect(prohibida.status()).toBe(403);
  expect(await prohibida.json()).toMatchObject({ detail: "Esta página es de la Coordinación." });
});
