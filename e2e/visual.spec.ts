import { expect, test, type Page } from "@playwright/test";
import { simularApi, type Cuenta } from "./api_simulada";

// Escenarios @playwright de US-82 en specs/008-ciclo-quimica-industrial/aceptacion/sistema_visual.feature del Back
// (T048). Cada prueba lleva el título del escenario, y el esquema suma la pantalla de su fila de Ejemplos. La API es la
// simulada de e2e/api_simulada.ts, con datos inventados, así que basta el Front de Vite que levanta playwright.config.ts.
// Cada prueba mira primero a 375 px, el ancho del escenario, y después a 1100 px, el de la configuración.

const ANCHOS = [375, 1100] as const;
const ALTO = 812;
const SECCION_701 = "5643 Química General, sección 701, 2026-1";

test.describe.configure({ mode: "parallel" });
test.use({ baseURL: `http://localhost:${process.env.PUERTO_VISUAL ?? 5199}` });

/** El documento no se desplaza de lado: su ancho no supera el de la ventana. */
async function anchoDelDocumento(page: Page) {
  return page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    cuerpo: document.body.scrollWidth,
    ventana: document.documentElement.clientWidth,
  }));
}

async function sinDesplazamientoLateral(page: Page) {
  const { documento, cuerpo, ventana } = await anchoDelDocumento(page);
  expect(documento, "ancho del documento").toBeLessThanOrEqual(ventana);
  expect(cuerpo, "ancho del cuerpo").toBeLessThanOrEqual(ventana);
}

/**
 * Cada control que se ve, con su medida. Cuenta los botones, también el «Elegir archivo» oculto al lector de pantalla,
 * los enlaces, los selectores y los campos visibles. El campo de archivo de P3 queda fuera porque vive en sr-only y su
 * objetivo visible es el botón «Elegir archivo».
 */
async function controlesChicos(page: Page) {
  return page.evaluate(() => {
    const chicos: string[] = [];
    let contados = 0;
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], select, input, [role=button]")) {
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      if (el.classList.contains("sr-only")) continue;
      contados++;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) chicos.push(`${el.tagName} «${el.textContent?.trim()}» ${r.width}x${r.height}`);
    }
    return { contados, chicos };
  });
}

async function controlesDe24(page: Page) {
  const { contados, chicos } = await controlesChicos(page);
  expect(contados, "controles visibles").toBeGreaterThan(0);
  expect(chicos).toEqual([]);
}

type Pantalla = "Ingreso" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

/** Abre la pantalla con la API simulada y devuelve las rutas sin respuesta, que deben quedar vacías. */
async function abrir(page: Page, pantalla: Pantalla) {
  const cuenta: Cuenta = pantalla === "Ingreso" ? "ninguna" : pantalla === "P7" ? "coordinacion_curso" : "docente701";
  const api = await simularApi(page, cuenta);
  await page.goto("/");
  const titulo = (nombre: string) => page.getByRole("heading", { level: 1, name: nombre, exact: true });
  if (pantalla === "Ingreso") {
    await expect(titulo("Ingreso")).toBeVisible();
    return api;
  }
  if (pantalla === "P7") {
    await expect(titulo("Avance del registro del curso")).toBeVisible();
    await expect(page.getByText(/^701 · /)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "5643 Química General" })).toBeVisible();
    return api;
  }
  await expect(titulo("Mis secciones")).toBeVisible();
  const tarjeta = page.getByRole("listitem").filter({ hasText: SECCION_701 });
  await expect(tarjeta).toHaveCount(1);
  const menu = page.getByRole("navigation", { name: "Menú principal" });
  if (pantalla === "P3") {
    await tarjeta.getByRole("button", { name: "Subir export" }).click();
    await expect(titulo("Subir export")).toBeVisible();
    await expect(page.getByText(SECCION_701)).toBeVisible();
  }
  if (pantalla === "P4") {
    await tarjeta.getByRole("button", { name: "Ver resultado" }).click();
    await expect(titulo("Resultado de la carga")).toBeVisible();
    await expect(page.getByText("34 filas leídas, 22 aceptadas y 12 rechazadas")).toBeVisible();
    // Spec 005. La tabla del semáforo y el análisis por indicador entran también en la revisión a 375 px.
    await expect(page.getByRole("region", { name: "Cómo va su sección" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Análisis por indicador" })).toBeVisible();
  }
  if (pantalla === "P5") {
    await menu.getByRole("button", { name: "Cargas" }).click();
    await expect(titulo("Cargas")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: SECCION_701 })).toBeVisible();
  }
  if (pantalla === "P6") {
    await menu.getByRole("button", { name: "Ver mis logros por SO" }).click();
    await expect(titulo("Mis logros por SO")).toBeVisible();
    await expect(page.getByRole("img", { name: /^Logro 77,3 %/ })).toBeVisible();
  }
  return api;
}

const PANTALLAS: Pantalla[] = ["Ingreso", "P2", "P3", "P4", "P5", "P6", "P7"];

test.describe("US-82 · Uso a 375 px y con teclado", () => {
  for (const pantalla of PANTALLAS) {
    test(`A 375 px de ancho ninguna pantalla se desplaza de lado (${pantalla})`, async ({ page }) => {
      await page.setViewportSize({ width: ANCHOS[0], height: ALTO });
      const api = await abrir(page, pantalla);
      for (const ancho of ANCHOS) {
        await page.setViewportSize({ width: ancho, height: ALTO });
        expect(await page.evaluate(() => window.innerWidth)).toBe(ancho);
        await sinDesplazamientoLateral(page);
        await controlesDe24(page);
      }
      expect(api.sinRespuesta).toEqual([]);
    });
  }

  test("La tabla de rechazos de P4 se desplaza dentro de su región y no la página", async ({ page }) => {
    await page.setViewportSize({ width: ANCHOS[0], height: ALTO });
    const api = await abrir(page, "P4");
    const region = page.getByRole("region", { name: "Tabla de filas rechazadas" });
    await expect(region).toHaveAttribute("tabindex", "0");
    const tabla = region.getByRole("table", { name: "Filas rechazadas" });
    await expect(tabla.getByRole("row")).toHaveCount(13);
    expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    await sinDesplazamientoLateral(page);

    // Una tabla más ancha que la ventana, como la de un mensaje largo, se desplaza dentro de la región y la página no.
    await tabla.evaluate((el) => {
      el.style.minWidth = "900px";
    });
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: ALTO });
      await sinDesplazamientoLateral(page);
      const medidas = await region.evaluate((el) => ({
        contenido: el.scrollWidth,
        visible: el.clientWidth,
        derecha: el.getBoundingClientRect().right,
      }));
      expect(medidas.contenido).toBeGreaterThan(medidas.visible);
      expect(medidas.derecha).toBeLessThanOrEqual(ancho);

      // El teclado alcanza la región y la desplaza con la flecha, sin mover la página.
      await region.focus();
      await expect(region).toBeFocused();
      await region.evaluate((el) => {
        el.scrollLeft = 0;
      });
      // Chromium pierde a veces la primera flecha que llega justo después del cambio de ancho, así que cada intento
      // vuelve a pulsarla con la región enfocada. Sin el desplazamiento por teclado, ningún intento mueve scrollLeft.
      await expect(async () => {
        await expect(region).toBeFocused();
        await page.keyboard.press("ArrowRight");
        expect(await region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      }).toPass({ timeout: 10_000 });
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
    }
    expect(api.sinRespuesta).toEqual([]);
  });

  /**
   * Lo que tiene el foco: la etiqueta, su nombre y si se ve su anillo. El campo de archivo vive en sr-only, así que su
   * anillo es el del recuadro punteado que lo sigue (peer-focus-visible en SubirExport.tsx).
   */
  async function enfocado(page: Page) {
    return page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const etiqueta = (el as HTMLInputElement).labels?.[0];
      const nombre = (etiqueta ? etiqueta.childNodes[0]?.textContent : el.textContent)?.trim() ?? "";
      const conAnillo = el.classList.contains("sr-only") ? (el.nextElementSibling as HTMLElement | null) : el;
      const estilo = conAnillo ? getComputedStyle(conAnillo) : null;
      const anillo = estilo !== null && estilo.outlineStyle !== "none" && parseFloat(estilo.outlineWidth) >= 2;
      return { control: `${el.tagName.toLowerCase()}: ${nombre}`, anillo, color: estilo?.outlineColor ?? "" };
    });
  }

  /** El color de un token de @theme tal como lo calcula el navegador, para compararlo con el del anillo. */
  async function colorDelToken(page: Page, token: string) {
    return page.evaluate((nombre) => {
      const sonda = document.createElement("div");
      sonda.style.outline = `2px solid var(--color-${nombre})`;
      document.body.append(sonda);
      const color = getComputedStyle(sonda).outlineColor;
      sonda.remove();
      return color;
    }, token);
  }

  test("El foco se ve en cada control de P3 y sigue el orden de lectura", async ({ page }) => {
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: ALTO });
      const api = await abrir(page, "P3");
      const colorFoco = await colorDelToken(page, "foco");
      // El foco parte del comienzo del documento, como al llegar con el teclado. El clic en la franja decorativa de
      // arriba mueve allí el punto de partida del Tab, que el clic en «Subir export» dejó en el contenido.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.mouse.click(1, 1);
      const recorrido: string[] = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const actual = await enfocado(page);
        if (actual === null || recorrido.includes(actual.control)) break;
        expect(actual.anillo, `anillo de foco en ${actual.control}`).toBe(true);
        // El anillo es del token foco, el mismo en cada control.
        expect(actual.color, `color del anillo en ${actual.control}`).toBe(colorFoco);
        recorrido.push(actual.control);
      }
      // «Salir» va antes del menú porque la cuenta encabeza la página. «Antes de subir» se lee entre el periodo y el
      // archivo y no toma el foco, porque no es un control.
      expect(recorrido).toEqual([
        "button: Salir",
        "button: Mis secciones",
        "button: Cargas",
        "button: Ver mis logros por SO",
        "select: Periodo",
        "input: Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)",
        "button: Subir",
        "button: Volver a mis secciones",
      ]);
      const orden = await page.evaluate(() => {
        const antes = document.querySelector("section[aria-labelledby=titulo-antes-de-subir]")!;
        const periodo = document.querySelector("header select")!;
        const archivo = document.querySelector("#archivo")!;
        return {
          despuesDelPeriodo: Boolean(periodo.compareDocumentPosition(antes) & Node.DOCUMENT_POSITION_FOLLOWING),
          antesDelArchivo: Boolean(antes.compareDocumentPosition(archivo) & Node.DOCUMENT_POSITION_FOLLOWING),
          enfocables: antes.querySelectorAll("a[href], button, input, select, [tabindex]").length,
        };
      });
      expect(orden).toEqual({ despuesDelPeriodo: true, antesDelArchivo: true, enfocables: 0 });
      expect(api.sinRespuesta).toEqual([]);
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  });

  test("El menú principal se usa solo con el teclado", async ({ page }) => {
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: ALTO });
      const api = await abrir(page, "P2");
      const menu = page.getByRole("navigation", { name: "Menú principal" });
      await expect(menu.getByRole("button", { name: "Mis secciones" })).toHaveAttribute("aria-current", "page");
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const cargas = menu.getByRole("button", { name: "Cargas" });
      for (let i = 0; i < 10 && !(await cargas.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(cargas).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { level: 1, name: "Cargas", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: SECCION_701 })).toBeVisible();
      await expect(cargas).toHaveAttribute("aria-current", "page");
      await expect(menu.getByRole("button", { name: "Mis secciones" })).not.toHaveAttribute("aria-current", /.*/);
      await expect(menu.locator("[aria-current]")).toHaveCount(1);
      expect(api.sinRespuesta).toEqual([]);
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  });
});
