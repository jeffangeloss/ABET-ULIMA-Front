import { expect, test, type Page } from "@playwright/test";
import { readFileSync, realpathSync, statSync, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCHIVO_CLAVES,
  capturar,
  celdasDelLibro,
  clave,
  ingresar,
  omitirProteccion,
  todasLasCeldas,
} from "./comun";
import { CONGELADA, YA_USADA, revisarSiembraInventada, revisarVistaPreviaNueva } from "./guardas_quimica";

// Humo de punta a punta de Química General en Ingeniería Industrial (spec 008, T053), con los escenarios @playwright de
// US-85 en capacitacion_en_develop.feature y de US-87 en guia_y_privacidad.feature del Back. Cada prueba lleva el título
// de su escenario. Corre contra la vista previa de develop con la siembra inventada (T071, URL_FRONT con https) o en
// local contra la API de un clúster desechable y el Vite que levanta playwright.config.ts, siempre con
// scripts/humo_quimica.sh, que borra los resultados y el archivo de contraseñas al terminar.
//
// Variables. URL_FRONT, ABET_CLAVES_ARCHIVO (líneas «correo clave» de docente701 a docente703 y de la coordinación),
// EXPORTS_QUIMICA (la carpeta del generador de US-74 con manifiesto.json y los exports de la 701 a la 703),
// EJERCICIO_QUIMICA (la carpeta del generador con --ejercicio de la 799), DIR_CAPTURAS y DIR_RESULTADOS, fuera de los
// repositorios. Solo datos inventados. La prueba corre una sola vez por cada restablecimiento de develop, porque la
// carga de la 701 se publica una sola vez, y sus guardas la detienen antes de ingresar si develop tiene la siembra de
// la capacitación y antes de la ruta 5 si la 701 ya tiene una carga publicada.

const PERIODO = "2026-1";
const ASIGNATURA = "5643";
const HOJA_R17 = "Cursos de Carrera";
const AJENA = "La sección no está a su cargo.";
const DOCENTE_701 = "docente701@example.invalid";
const DOCENTE_702 = "docente702@example.invalid";
const DOCENTE_703 = "docente703@example.invalid";
const COORDINACION = "coordinador.quimica@example.invalid";
const EXPORTS = process.env.EXPORTS_QUIMICA ?? "";
const EJERCICIO = process.env.EJERCICIO_QUIMICA ?? "";
const BASE = process.env.URL_FRONT ?? "http://localhost:5173";
const LLEGADA_COORDINACION = /^(Avance del registro del curso|Secciones del curso)$/;

interface SeccionApi {
  seccion_id: number;
  asignatura: { codigo: string };
  numero: string;
  estado: string;
  carga_id: number | null;
}

interface Export {
  ruta: string;
  nombre: string;
  filas: number;
}

/** El export de una sección según el manifiesto del generador de US-74, sin leer nada más de la carpeta. */
function exportDe(carpeta: string, seccion: string): Export {
  const manifiesto = JSON.parse(readFileSync(path.join(carpeta, "manifiesto.json"), "utf8")) as {
    periodo: string;
    asignatura: string;
    exports: { seccion: string; archivo: string; filas: number }[];
  };
  expect(manifiesto.periodo, "periodo del manifiesto").toBe(PERIODO);
  expect(manifiesto.asignatura, "asignatura del manifiesto").toBe(ASIGNATURA);
  const fila = manifiesto.exports.find((e) => e.seccion === seccion);
  if (!fila) throw new Error(`El manifiesto no trae la sección ${seccion}`);
  return { ruta: path.join(carpeta, fila.archivo), nombre: fila.archivo, filas: fila.filas };
}

const sinRechazos = (n: number) => `${n} filas leídas, ${n} aceptadas y 0 rechazadas`;

/** Verdadero si la ruta, o una carpeta que la contiene, es la raíz de un clon de git. */
function dentroDeUnRepositorio(ruta: string): boolean {
  let actual = existsSync(ruta) ? realpathSync(ruta) : path.resolve(ruta);
  for (;;) {
    if (existsSync(path.join(actual, ".git"))) return true;
    const arriba = path.dirname(actual);
    if (arriba === actual) return false;
    actual = arriba;
  }
}

// Cada captura del humo se toma con esta función, que antes revisa que ningún campo de contraseña tenga texto.
const capturas: string[] = [];
async function capturarSinClave(page: Page, nombre: string) {
  const conTexto = await page
    .locator('input[type="password"]')
    .evaluateAll((campos) => campos.filter((c) => (c as HTMLInputElement).value !== "").length);
  expect(conTexto, `la captura ${nombre} mostraría un campo de contraseña con texto`).toBe(0);
  capturas.push(nombre);
  await capturar(page, nombre);
}

async function secciones(page: Page, periodo = PERIODO): Promise<SeccionApi[]> {
  const r = await page.request.get(`/api/secciones?periodo=${periodo}`);
  expect(r.status(), `ruta 4 de ${periodo}`).toBe(200);
  return (await r.json()) as SeccionApi[];
}

async function descargarR17(page: Page): Promise<Buffer> {
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar R-17" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^R017_5643_70\d_2026-1.*\.xlsx$/);
  return readFileSync(await archivo.path());
}

/** P2 a P4 del profesor en su sección, con el export de la sección elegida, hasta la carga PUBLICADA sin rechazos. */
async function subirEnP2(page: Page, numero: string, exp: Export) {
  const tarjeta = page.getByRole("main").getByRole("listitem").filter({ hasText: `sección ${numero}, ${PERIODO}` });
  await tarjeta.getByRole("button", { name: "Subir export" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();
  await page.locator("#archivo").setInputFiles(exp.ruta);
  await page.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("Estado de la carga: Publicada")).toBeVisible();
  await expect(page.getByText(sinRechazos(exp.filas))).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await omitirProteccion(context);
});

// Las guardas corren antes de cualquier ingreso por el navegador. Si una se detiene, ninguna prueba sigue.
test.beforeAll(async () => {
  expect(ARCHIVO_CLAVES, "falta ABET_CLAVES_ARCHIVO").not.toBe("");
  expect(EXPORTS, "falta EXPORTS_QUIMICA, la carpeta del generador de US-74").not.toBe("");
  expect(EJERCICIO, "falta EJERCICIO_QUIMICA, la carpeta del generador con --ejercicio").not.toBe("");
  await revisarSiembraInventada(BASE, clave(COORDINACION));
  await revisarVistaPreviaNueva(BASE, clave(DOCENTE_701));
});

let r17DelProfesor: Buffer | null = null;
let carga702: number | null = null;

test("Con la siembra de la capacitación el humo no corre", async () => {
  // Una API simulada que imita develop con la siembra de la capacitación: la coordinación ve 18 secciones de 5643.
  let lista: { seccion_id: number; asignatura: { codigo: string; nombre: string }; numero: string }[] = [];
  const pedidas: string[] = [];
  const servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
    pedidas.push(`${req.method} ${req.url}`);
    if (req.method === "POST" && req.url === "/api/sesion") {
      res.writeHead(200, { "content-type": "application/json", "set-cookie": "abet_sesion=simulada; Path=/; HttpOnly" });
      res.end(JSON.stringify({ correo: COORDINACION, rol: "COORDINADOR" }));
    } else if (req.method === "GET" && req.url === `/api/secciones?periodo=${PERIODO}`) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(lista));
    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ detail: "No existe." }));
    }
  });
  await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
  const simulada = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  const seccion = (n: number) => ({ seccion_id: n, asignatura: { codigo: ASIGNATURA, nombre: "Química General" }, numero: String(n) });
  try {
    lista = Array.from({ length: 18 }, (_, i) => seccion(801 + i));
    await expect(revisarSiembraInventada(simulada, "clave-simulada")).rejects.toThrow(CONGELADA);
    expect(pedidas.filter((p) => !["POST /api/sesion", `GET /api/secciones?periodo=${PERIODO}`].includes(p))).toEqual([]);
    // Con las cuatro secciones inventadas, en cualquier orden, la misma guarda deja seguir.
    lista = [703, 701, 704, 702].map(seccion);
    await expect(revisarSiembraInventada(simulada, "clave-simulada")).resolves.toBeUndefined();
  } finally {
    await new Promise((listo) => servidor.close(listo));
  }
});

test("El profesor sube su export y descarga su R-17 en la vista previa", async ({ page }) => {
  const export701 = exportDe(EXPORTS, "701");
  expect(export701.nombre).toBe("gc_SINTETICO_20261_5643_701_fullgc_2026-07-15-00-00-00.xlsx");

  await ingresar(page, DOCENTE_701);
  await expect(page.getByRole("banner")).toContainText(`Periodo ${PERIODO}`);
  const tarjetas = page.getByRole("main").getByRole("listitem");
  await expect(tarjetas).toHaveCount(1);
  await expect(tarjetas.first()).toContainText(`${ASIGNATURA} `);
  await expect(tarjetas.first()).toContainText(`sección 701, ${PERIODO}`);
  await expect(tarjetas.first()).toContainText("Falta subir el export de Blackboard de esta sección.");
  await capturarSinClave(page, "P2_docente701.png");

  await tarjetas.first().getByRole("button", { name: "Subir export" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("En Blackboard, una columna por PI, con el nombre ABET SO6.1.");
  await page.locator("#archivo").setInputFiles(export701.ruta);
  await capturarSinClave(page, "P3_docente701.png");
  await page.getByRole("button", { name: "Subir", exact: true }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("Estado de la carga: Publicada")).toBeVisible();
  await expect(page.getByText(sinRechazos(export701.filas))).toBeVisible();
  await capturarSinClave(page, "P4_docente701.png");
  r17DelProfesor = await descargarR17(page);
  expect(celdasDelLibro(r17DelProfesor, HOJA_R17, ["B6"]).B6).toBe("Carrera de Ingeniería Industrial");
});

test("El R-17 del profesor de la 701 lleva su nombre inventado en D10 y en ninguna otra celda", async () => {
  // Spec 010 (T040, US-97). D10 sale con los profesores asignados a la sección, y la 701 tiene uno solo.
  const NOMBRE_701 = "Profesor Inventado Setecientos Uno";
  expect(r17DelProfesor, "el R-17 del primer escenario").not.toBeNull();
  expect(celdasDelLibro(r17DelProfesor!, HOJA_R17, ["B10", "D10"]).D10).toBe(NOMBRE_701);
  const otras = Object.entries(todasLasCeldas(r17DelProfesor!, HOJA_R17)).filter(([ref]) => ref !== "D10");
  expect(otras.filter(([, valor]) => valor !== null && valor.includes("Profesor Inventado")), "otras celdas con un nombre").toEqual([]);
  expect(otras.filter(([, valor]) => valor === NOMBRE_701)).toEqual([]);
});

test("El profesor sigue la guía de su rol de punta a punta en la vista previa", async ({ page }) => {
  // La tarjeta inventada de docente701, con la 701 y el archivo que el manifiesto le da.
  const tarjeta = { correo: DOCENTE_701, seccion: "701", archivo: "gc_SINTETICO_20261_5643_701_fullgc_2026-07-15-00-00-00.xlsx" };
  const export701 = exportDe(EXPORTS, tarjeta.seccion);
  expect(export701.nombre).toBe(tarjeta.archivo);

  // Ingresar y «Mis secciones».
  await ingresar(page, tarjeta.correo);
  const p2 = page.getByRole("main").getByRole("listitem").filter({ hasText: `sección ${tarjeta.seccion}, ${PERIODO}` });
  await expect(p2).toHaveCount(1);
  // «Subir export» y «Antes de subir» en P3.
  await p2.getByRole("button", { name: "Subir export" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Subir export" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Antes de subir" })).toBeVisible();
  // El archivo de la tarjeta. En la misma corrida el escenario anterior ya lo publicó, así que la ruta 5 responde el 200
  // del mismo archivo y P3 lo dice sin cargarlo de nuevo (cambio del 2026-11-23 propuesto en el informe de T053).
  await page.locator("#archivo").setInputFiles(export701.ruta);
  await page.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(page.getByText(/^Este archivo ya se cargó el .* y está publicado en la sección 701\. No se cargó de nuevo\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Ver resultado" }).click();
  // «Resultado de la carga» con la carga publicada y «Descargar R-17».
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  await expect(page.getByText("Estado de la carga: Publicada")).toBeVisible();
  await expect(page.getByText(sinRechazos(export701.filas))).toBeVisible();
  const libro = await descargarR17(page);
  expect(celdasDelLibro(libro, HOJA_R17, ["B6"]).B6).toBe("Carrera de Ingeniería Industrial");
});

test("Una vista previa ya usada se detiene antes de subir", async ({ page }) => {
  // La 701 ya tiene la carga PUBLICADA del primer escenario, como la tendría después de una corrida anterior.
  await ingresar(page, DOCENTE_701);
  const cargasAntes = (await secciones(page)).find((s) => s.numero === "701");
  expect(cargasAntes?.estado).toBe("PUBLICADA");
  const listaAntes = await (await page.request.get(`/api/cargas?seccion_id=${cargasAntes!.seccion_id}`)).json();

  await expect(revisarVistaPreviaNueva(BASE, clave(DOCENTE_701))).rejects.toThrow(YA_USADA);

  // La guarda no llegó a la ruta 5: la 701 tiene las mismas cargas que antes.
  const listaDespues = await (await page.request.get(`/api/cargas?seccion_id=${cargasAntes!.seccion_id}`)).json();
  expect(listaDespues).toEqual(listaAntes);
});

test("El profesor no alcanza otra sección del curso", async ({ page }) => {
  const export702 = exportDe(EXPORTS, "702");
  await ingresar(page, DOCENTE_702);
  await subirEnP2(page, "702", export702);
  const propias = await secciones(page);
  expect(propias.map((s) => s.numero)).toEqual(["702"]);
  carga702 = propias[0].carga_id;
  expect(carga702).not.toBeNull();
  await page.getByRole("banner").getByRole("button", { name: "Salir" }).click();

  await ingresar(page, DOCENTE_701);
  const ruta4 = await secciones(page);
  expect(ruta4.map((s) => `${s.asignatura.codigo} ${s.numero}`)).toEqual([`${ASIGNATURA} 701`]);
  const ruta7 = await page.request.get(`/api/cargas/${carga702}/r17.xlsx`);
  expect(ruta7.status()).toBe(403);
  expect(await ruta7.json()).toEqual({ detail: AJENA });
});

test("El ejercicio de error usa un export inventado y enseña a leer «Qué corregir»", async ({ page }) => {
  // Cambio del 2026-11-23 propuesto en el informe de T053. El ejercicio corre en la 703 con docente703, porque en la
  // misma corrida la 701 ya tiene su carga PUBLICADA, que haría responder 409 a la ruta 5 antes de leer la sección, y
  // la 701 sin carga hace falta para el primer escenario de US-85.
  const ejercicio = exportDe(EJERCICIO, "799");
  expect(ejercicio.nombre).toMatch(/^gc_EJERCICIO_20261_5643_799_fullgc_.*_ejercicio\d+\.xlsx$/);
  await ingresar(page, DOCENTE_703);
  const antes = (await secciones(page)).find((s) => s.numero === "703")!;
  expect(antes.estado).toBe("SIN_CARGA");

  const tarjeta = page.getByRole("main").getByRole("listitem").filter({ hasText: `sección 703, ${PERIODO}` });
  await tarjeta.getByRole("button", { name: "Subir export" }).click();
  await page.locator("#archivo").setInputFiles(ejercicio.ruta);
  await page.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main).toContainText("Estado de la carga: Rechazada");
  await expect(main).toContainText("El archivo corresponde a la sección 799 y usted eligió la 703. No se publicó.");
  await expect(main).toContainText(
    "Qué corregir. Exporte el Centro de calificaciones de 5643, sección 703, o suba este archivo en la sección que le corresponde.",
  );
  await capturarSinClave(page, "P4_ejercicio_docente703.png");

  // La guía sigue el ejercicio con «Suba ahora el archivo de su sección.».
  const guia = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs/capacitacion/guia_quimica.md"), "utf8");
  const enLaGuia = guia.indexOf("Qué corregir.", guia.indexOf("sección 799"));
  expect(enLaGuia, "la guía explica «Qué corregir.» en el ejercicio").toBeGreaterThan(-1);
  expect(guia.indexOf("Suba ahora el archivo de su sección.", enLaGuia)).toBeGreaterThan(enLaGuia);

  // La 703 conserva «Subir export» y no gana ninguna medición del ejercicio.
  await page.getByRole("button", { name: "Volver a mis secciones" }).click();
  await expect(tarjeta).toContainText("La última carga se rechazó y no se publicó. Falta subir un export corregido.");
  await expect(tarjeta.getByRole("button", { name: "Subir export" })).toBeEnabled();
  const despues = (await secciones(page)).find((s) => s.numero === "703")!;
  expect(despues.estado).toBe("SIN_CARGA");
  expect(despues.carga_id).toBeNull();
  const cargas = (await (await page.request.get(`/api/cargas?seccion_id=${despues.seccion_id}`)).json()) as {
    estado: string;
    filas_aceptadas: number;
  }[];
  expect(cargas.map((c) => [c.estado, c.filas_aceptadas])).toEqual([["RECHAZADA", 0]]);
});

test("La coordinación del curso ve las secciones del curso y el avance", async ({ page }) => {
  await ingresar(page, COORDINACION, LLEGADA_COORDINACION);
  const llegada = await page.getByRole("heading", { level: 1 }).textContent();
  test.skip(llegada !== "Avance del registro del curso", "La vista previa no tiene P7. Corre el escenario sin la etapa B.");

  await expect(page.getByRole("main")).toContainText("2 de 4 secciones con carga publicada.");
  await capturarSinClave(page, "P7_coordinacion_quimica.png");
  const ruta4 = await secciones(page);
  expect(ruta4).toHaveLength(4);
  expect(ruta4.every((s) => s.asignatura.codigo === ASIGNATURA)).toBe(true);

  const fila701 = page.getByRole("main").getByRole("listitem").filter({ hasText: /^701 · / });
  await fila701.getByRole("button", { name: "Ver la carga" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeVisible();
  const libro = await descargarR17(page);
  expect(r17DelProfesor, "el R-17 del primer escenario").not.toBeNull();
  const delProfesor = todasLasCeldas(r17DelProfesor!, HOJA_R17);
  expect(Object.keys(delProfesor).length).toBeGreaterThan(50);
  expect(todasLasCeldas(libro, HOJA_R17)).toEqual(delProfesor);
});

test("Sin la etapa B, la coordinación del curso se comprueba en P2", async ({ page }) => {
  await ingresar(page, COORDINACION, LLEGADA_COORDINACION);
  if ((await page.getByRole("heading", { level: 1 }).textContent()) === "Avance del registro del curso") {
    // Con P7 la coordinación llega a P7, y P2 se abre desde el menú con la misma comprobación.
    test.info().annotations.push({ type: "con P7", description: "P2 se abrió desde el menú «Secciones del curso»." });
    await page.getByRole("banner").getByRole("button", { name: "Secciones del curso" }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "Secciones del curso" })).toBeVisible();
  const tarjetas = page.getByRole("main").getByRole("listitem");
  await expect(tarjetas).toHaveCount(4);
  for (const numero of ["701", "702", "703", "704"]) {
    await expect(tarjetas.filter({ hasText: `${ASIGNATURA} ` }).filter({ hasText: `sección ${numero}, ${PERIODO}` })).toHaveCount(1);
  }
  await expect(page.getByRole("button", { name: "Subir export" })).toHaveCount(0);
  await capturarSinClave(page, "P2_coordinacion_quimica.png");
});

test("La coordinación del curso no sube en una sección ni ve otro curso", async ({ page }) => {
  await ingresar(page, COORDINACION, LLEGADA_COORDINACION);
  const s703 = (await secciones(page)).find((s) => s.numero === "703")!;
  const cargasAntes = await (await page.request.get(`/api/cargas?periodo=${PERIODO}`)).json();

  const export703 = exportDe(EXPORTS, "703");
  const ruta5 = await page.request.post(`/api/secciones/${s703.seccion_id}/cargas`, {
    multipart: {
      archivo: {
        name: export703.nombre,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: readFileSync(export703.ruta),
      },
    },
  });
  expect(ruta5.status()).toBe(403);
  expect(await ruta5.json()).toEqual({ detail: AJENA });

  const otroPeriodo = await secciones(page, "2026-2");
  expect(otroPeriodo.some((s) => s.asignatura.codigo === "450002" && ["410", "411"].includes(s.numero))).toBe(false);

  // Lo que lectura_neon.sh cuenta desde el Windows en T071, leído aquí por la API: las cargas del curso no cambian.
  expect(await (await page.request.get(`/api/cargas?periodo=${PERIODO}`)).json()).toEqual(cargasAntes);
  expect((await secciones(page)).find((s) => s.numero === "703")!.carga_id).toBeNull();
});

test("Las capturas y los resultados no guardan nada sensible", async () => {
  // scripts/humo_quimica.sh borra al terminar la carpeta de resultados y el archivo de contraseñas, y comprueba que ya
  // no existen. Aquí se comprueba lo que esa limpieza necesita.
  expect(process.env.HUMO_QUIMICA_LIMPIEZA, "el humo corre con scripts/humo_quimica.sh").toBe("1");
  const resultados = test.info().project.outputDir;
  expect(process.env.DIR_RESULTADOS, "DIR_RESULTADOS").toBeTruthy();
  expect(path.resolve(resultados)).toBe(path.resolve(process.env.DIR_RESULTADOS!));
  expect(dentroDeUnRepositorio(resultados), "la carpeta de resultados queda fuera de los repositorios").toBe(false);
  expect(dentroDeUnRepositorio(ARCHIVO_CLAVES), "el archivo de contraseñas queda fuera de los repositorios").toBe(false);
  expect(statSync(ARCHIVO_CLAVES).mode & 0o077, "el archivo de contraseñas tiene permisos 600").toBe(0);
  const carpeta = process.env.DIR_CAPTURAS ?? "";
  expect(carpeta, "DIR_CAPTURAS").not.toBe("");
  expect(dentroDeUnRepositorio(carpeta), "las capturas quedan fuera de los repositorios").toBe(false);
  // Cada captura pasó por capturarSinClave, que revisa los campos de contraseña antes de tomarla.
  expect(capturas.length).toBeGreaterThanOrEqual(5);
  for (const nombre of capturas) expect(existsSync(path.join(carpeta, nombre)), nombre).toBe(true);
});
