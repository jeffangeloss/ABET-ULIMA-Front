import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { boton, botonSecundario, paresDeComponente, paresDeTexto } from "../../src/componentes/estilos";
import { TablaRechazos } from "../../src/componentes/TablaRechazos";
import { Avance } from "../../src/pantallas/Avance";
import { Cargas } from "../../src/pantallas/Cargas";
import { Ingreso } from "../../src/pantallas/Ingreso";
import { COLORES, MisLogros } from "../../src/pantallas/MisLogros";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import { leerTokensDeColor, razonDeContraste } from "../../src/servicios/contraste";
import type { Seccion } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import indexHtml from "../../index.html?raw";
import indexCss from "../../src/index.css?raw";
import paqueteTexto from "../../package.json?raw";
import candadoTexto from "../../package-lock.json?raw";
import {
  cargaRechazada701,
  constanciaConError,
  resultados410,
  seccion701,
  seccionPublicada,
  seccionSinCarga,
  usuarioCoordinacionCurso,
  usuarioDocente701,
  usuarioProfesor,
} from "../respuestas";

// Escenarios @delegado_a_vitest de US-81 en specs/008-ciclo-quimica-industrial/aceptacion/sistema_visual.feature del
// Back. Cada «it» lleva el título del escenario, y cada esquema suma los valores de su fila de Ejemplos. Los escenarios
// @playwright de US-82 viven en e2e/ (T048).

// La construcción que deja npm run build en dist/ también se revisa, así que la prueba de recursos exige su index.html y su
// CSS. La CI corre npm run build antes de npm test, y en local hay que construir antes de correr esta prueba.
const construccion = import.meta.glob<string>(["../../dist/index.html", "../../dist/assets/*.css"], {
  query: "?raw",
  import: "default",
  eager: true,
});
// El código de las pantallas, para la prueba de contraste, que busca en sus clases los pares de texto y fondo en uso.
const fuentesDeSrc = import.meta.glob<string>("../../src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });

const PALETA_TAILWIND =
  /^(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black)$/;

/**
 * Clases de color de cada texto literal de un archivo. Une antes los literales concatenados con «+», como los de
 * estilos.ts, aunque abran y cierren con comillas distintas, y separa cada clase en su prefijo de variante (hover:,
 * disabled:), su propiedad y su color.
 */
function coloresDeLiterales(fuente: string) {
  const unida = fuente.replace(/["'`]\s*\+\s*["'`]/g, " ");
  return Array.from(unida.matchAll(/["'`]([^"'`]*)["'`]/g), (m) =>
    m[1].split(/\s+/).flatMap((clase) => {
      const c = /^((?:[a-z-]+:)*)(text|bg|border|outline|ring)-([a-z0-9-]+)$/.exec(clase);
      return c ? [{ clase, prefijo: c[1], propiedad: c[2], color: c[3] }] : [];
    }),
  );
}

/** Pares de texto y fondo de un literal, por variante. Una variante sin texto o sin fondo propio hereda el de la base. */
function paresEnUso(literal: ReturnType<typeof coloresDeLiterales>[number], tokens: Record<string, string>) {
  const porPrefijo = new Map<string, { text?: string; bg?: string }>();
  for (const { prefijo, propiedad, color } of literal) {
    if (!(color in tokens) || (propiedad !== "text" && propiedad !== "bg")) continue;
    porPrefijo.set(prefijo, { ...porPrefijo.get(prefijo), [propiedad]: color });
  }
  const base = porPrefijo.get("") ?? {};
  return Array.from(porPrefijo.values(), (v) => [v.text ?? base.text, v.bg ?? base.bg] as const).filter(
    (par): par is readonly [string, string] => par[0] !== undefined && par[1] !== undefined,
  );
}

const acciones = () => ({ alSubir: vi.fn(), alVerResultado: vi.fn() });
const nunca = () => new Promise<never>(() => undefined);

const SECCIONES_2026_1 = "GET /api/secciones?periodo=2026-1";
const CARGAS_2026_1 = "GET /api/cargas?periodo=2026-1";
const CAMINO = "Camino de la sección";
const sinPlan = "La carrera aún no registra el plan de medición de esta sección";

/** Paso del camino por su texto visible, con su marca escrita y su texto para el lector de pantalla. */
function paso(tarjeta: HTMLElement, texto: string) {
  const el = within(within(tarjeta).getByRole("group", { name: CAMINO })).getByText(texto).closest("[data-paso]");
  if (!(el instanceof HTMLElement)) throw new Error(`Sin el paso ${texto}`);
  return el;
}

const marcaDe = (el: HTMLElement) => el.querySelector("[data-marca]")?.textContent;
const lectorDe = (el: HTMLElement) => el.querySelector(".sr-only")?.textContent;

describe("US-81 · Sistema visual común, claro y accesible AA", () => {
  it("Los pares de color de texto y fondo cumplen el contraste AA", () => {
    // La función propia sigue la fórmula de WCAG 2.2 y no aprueba un gris que queda bajo 4,5 a 1.
    expect(razonDeContraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(razonDeContraste("#777777", "#ffffff")).toBeLessThan(4.5);
    expect(razonDeContraste("#1f3b5c", "#ffffff")).toBeCloseTo(razonDeContraste("#ffffff", "#1f3b5c"), 10);

    const css = indexCss;
    expect(css).toMatch(/@theme\s*\{/);
    const tokens = leerTokensDeColor(css);
    expect(paresDeTexto.length).toBeGreaterThanOrEqual(10);
    expect(paresDeComponente.length).toBeGreaterThanOrEqual(4);
    for (const [texto, fondo] of paresDeTexto) {
      expect(tokens[texto], `token ${texto}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tokens[fondo], `token ${fondo}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(razonDeContraste(tokens[texto], tokens[fondo]), `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const [marca, fondo] of paresDeComponente) {
      expect(razonDeContraste(tokens[marca], tokens[fondo]), `${marca} contra ${fondo}`).toBeGreaterThanOrEqual(3);
    }
    // El borde de los campos y el anillo de foco están entre los pares de 3 a 1, y la marca de la meta de P6 también.
    const componentes = paresDeComponente.map(([m]) => m);
    expect(componentes).toEqual(expect.arrayContaining(["borde-campo", "foco"]));
    expect(razonDeContraste(COLORES.meta, COLORES.fondo)).toBeGreaterThanOrEqual(3);
    // Un token que no existe no pasa en silencio.
    expect(leerTokensDeColor("@theme { --color-tinta: #172231; }")).toEqual({ tinta: "#172231" });
    expect(leerTokensDeColor(":root { --color-tinta: #172231; }")).toEqual({});

    // Cada par de texto y fondo que escriben juntos las clases de src está en paresDeTexto, así que la lista no deja
    // fuera un par en uso. Un texto que hereda el fondo de un elemento padre no se ve aquí, y lo cubre T048 en Playwright.
    const archivos = Object.entries(fuentesDeSrc);
    expect(archivos.length).toBeGreaterThan(10);
    const listados = new Set(paresDeTexto.map(([t, f]) => `${t} sobre ${f}`));
    const enUso = new Set<string>();
    const sinToken = new Set<string>();
    for (const [, fuente] of archivos) {
      for (const literal of coloresDeLiterales(fuente)) {
        for (const [t, f] of paresEnUso(literal, tokens)) enUso.add(`${t} sobre ${f}`);
        for (const { clase, color } of literal) if (PALETA_TAILWIND.test(color)) sinToken.add(clase);
      }
    }
    expect(enUso.size).toBeGreaterThan(5);
    expect([...enUso].filter((par) => !listados.has(par)), "pares en uso fuera de paresDeTexto").toEqual([]);
    // Desde T045 ninguna pantalla usa un color de la paleta de Tailwind fuera de los tokens (Ingreso y P2 a P7).
    expect([...sinToken].sort(), "clases de la paleta de Tailwind sin token").toEqual([]);
    // El lector de clases sí ve un color de la paleta, también con su variante.
    const conPaleta = coloresDeLiterales('"border border-slate-300 peer-focus-visible:outline-sky-600"')[0];
    expect(conPaleta.filter(({ color }) => PALETA_TAILWIND.test(color)).map(({ clase }) => clase)).toEqual([
      "border-slate-300", "peer-focus-visible:outline-sky-600",
    ]);
    // El lector de clases sí encuentra un par en uso, también en una variante que hereda el texto de la base.
    const ejemplo = coloresDeLiterales('const x = "bg-superficie text-tinta " + `hover:bg-papel`;')[0];
    expect(paresEnUso(ejemplo, tokens)).toEqual([["tinta", "superficie"], ["tinta", "papel"]]);
  });

  it.each([
    { pantalla: "P2", estado: "esperando", rol: "status" },
    { pantalla: "P2", estado: "en 500", rol: "alert" },
    { pantalla: "P4", estado: "esperando", rol: "status" },
    { pantalla: "P5", estado: "esperando", rol: "status" },
    { pantalla: "P6", estado: "en 500", rol: "alert" },
    { pantalla: "P7", estado: "esperando", rol: "status" },
  ] as const)("Cada estado de una pantalla usa su componente y su rol ($pantalla $estado)", async ({ pantalla, estado, rol }) => {
    const respuesta = estado === "esperando" ? nunca : json(500, { detail: "Ocurrió un error interno. Intente de nuevo." });
    const rutas = {
      P2: [SECCIONES_2026_1],
      P4: ["GET /api/cargas/7"],
      P5: [SECCIONES_2026_1, CARGAS_2026_1],
      P6: ["GET /api/resultados?periodo=2026-1"],
      P7: ["GET /api/avance?periodo=2026-1"],
    }[pantalla];
    simularApi(Object.fromEntries(rutas.map((r) => [r, respuesta])));
    const comunes = { usuario: usuarioDocente701, periodo: "2026-1" };
    if (pantalla === "P2") render(<MisSecciones {...comunes} {...acciones()} />);
    if (pantalla === "P4") render(<ResultadoCarga cargaId={7} rol="PROFESOR" alVolver={vi.fn()} />);
    if (pantalla === "P5") render(<Cargas {...comunes} alVerResultado={vi.fn()} alReemplazar={vi.fn()} />);
    if (pantalla === "P6") render(<MisLogros {...comunes} alVolver={vi.fn()} />);
    // P7 es de la coordinación, porque la ruta 17 responde 403 al profesor, así que su fila la abre la del curso.
    if (pantalla === "P7") render(<Avance usuario={usuarioCoordinacionCurso} periodo="2026-1" alVerCarga={vi.fn()} />);
    const el = await screen.findByRole(rol);
    expect(el).toHaveAttribute("data-componente", estado === "esperando" ? "espera" : "error");
    if (estado === "esperando") expect(el.querySelector("[data-indicador]")).not.toBeNull();
    else expect(el).toHaveTextContent("Ocurrió un error interno. Intente de nuevo.");
    expect(screen.queryAllByRole(rol === "status" ? "alert" : "status")).toHaveLength(0);
  });

  it("Los rótulos fijados no cambian con el rediseño", async () => {
    simularApi({
      "GET /api/sesion": json(401, { detail: "La sesión venció. Ingrese otra vez." }),
      "POST /api/sesion": json(200, usuarioProfesor),
      "GET /api/periodos": json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }),
      "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]),
      "GET /api/cargas": json(200, []),
      "GET /api/cargas/7": json(200, constanciaConError),
      // La ruta 13 de la spec 005 en 404, como un Back anterior, conserva el enlace «Descargar R-17» de P4 (AD-28).
      "GET /api/cargas/7/indicadores": json(404, { detail: "Not Found" }),
      "GET /api/resultados": json(200, resultados410),
    });
    const u = userEvent.setup();
    render(<App />);
    const encabezado = within(screen.getByRole("banner"));
    expect(encabezado.getByText("ABET ULIMA, carga del R-17")).toBeInTheDocument();
    await u.type(await screen.findByLabelText("Correo"), "docente410@example.invalid");
    await u.type(screen.getByLabelText("Contraseña"), "clave-de-prueba");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
    const [publicada, sinCarga] = await screen.findAllByRole("listitem");
    expect(within(sinCarga).getByText("Sin carga", { selector: "p" })).toBeInTheDocument();

    await u.click(within(sinCarga).getByRole("button", { name: "Subir export" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Subir export" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Antes de subir" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Volver a mis secciones" }));

    const [otraVez] = await screen.findAllByRole("listitem");
    expect(otraVez).toHaveTextContent(publicada.textContent ?? "");
    await u.click(within(otraVez).getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Descargar R-17" })).toBeInTheDocument();

    await u.click(within(screen.getByRole("navigation", { name: "Menú principal" })).getByRole("button", { name: "Cargas" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Cargas" })).toBeInTheDocument();
    await u.click(encabezado.getByRole("button", { name: "Ver mis logros por SO" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeInTheDocument();
  });

  const conPlan = (cambios: Partial<Seccion>): Seccion => ({ ...seccion701, ...cambios });
  const publicada701 = conPlan({ estado: "PUBLICADA", carga_id: 30, filas_aceptadas: 34, filas_leidas: 34 });

  it.each([
    {
      estado: "SIN_CARGA", seccion: seccion701, cargas: [], paso1: "Ahora", paso2: "Pendiente", actual: 1,
      textoActual: "Sin carga", loQueFalta: "Falta subir el export de Blackboard de esta sección.",
    },
    {
      estado: "SIN_CARGA", seccion: seccion701, cargas: [cargaRechazada701], paso1: "Corregir", paso2: "Pendiente", actual: 1,
      textoActual: "Sin carga", loQueFalta: "La última carga se rechazó y no se publicó. Falta subir un export corregido.",
    },
    {
      estado: "PUBLICADA", seccion: publicada701, cargas: [{ ...cargaRechazada701, carga_id: 30, estado: "PUBLICADA" }],
      paso1: "Hecho", paso2: "Ahora", actual: 2, textoActual: "Publicada, 34 de 34 filas aceptadas",
      loQueFalta: "Revise el resultado de la carga para completar lo que falte y descargar el R-17.",
    },
  ])(
    "La tarjeta de P2 muestra el camino de la sección y su paso actual ($estado, $paso1, $paso2)",
    async ({ seccion, cargas, paso1, paso2, actual, textoActual, loQueFalta }) => {
      simularApi({ [SECCIONES_2026_1]: json(200, [seccion]), [CARGAS_2026_1]: json(200, cargas) });
      render(<MisSecciones usuario={usuarioDocente701} periodo="2026-1" {...acciones()} />);
      const tarjeta = await screen.findByRole("listitem");
      await within(tarjeta).findByText(loQueFalta, { selector: "p" });
      const pasos = [paso(tarjeta, "1. Subir el export"), paso(tarjeta, "2. Revisar el resultado y descargar el R-17")];
      expect(pasos.map(marcaDe)).toEqual([paso1, paso2]);
      expect(pasos.map((p) => p.getAttribute("aria-current"))).toEqual(actual === 1 ? ["step", null] : [null, "step"]);
      expect(within(tarjeta).getByText(textoActual, { selector: "p" })).toBeInTheDocument();
      // Los pasos no son elementos de lista, así que cada tarjeta sigue siendo el único listitem de su sección.
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    },
  );

  it("El botón principal de la tarjeta es el del paso actual", async () => {
    simularApi({ [SECCIONES_2026_1]: json(200, [publicada701, seccion701]), [CARGAS_2026_1]: json(200, []) });
    const a = acciones();
    render(<MisSecciones usuario={usuarioDocente701} periodo="2026-1" {...a} />);
    const [publicada, sinCarga] = await screen.findAllByRole("listitem");
    await within(publicada).findByRole("group", { name: CAMINO });
    const ver = within(publicada).getByRole("button", { name: "Ver resultado" });
    const subir = within(publicada).getByRole("button", { name: "Subir export" });
    expect(ver.className).toBe(boton);
    expect(subir.className).toBe(botonSecundario);
    expect(subir).toBeEnabled();
    expect(ver).toAppearBefore(subir);
    await userEvent.click(subir);
    expect(a.alSubir).toHaveBeenCalledWith(publicada701);
    // En la sección sin carga el paso actual es subir, y «Subir export» vuelve a ser el principal.
    expect(within(sinCarga).getByRole("button", { name: "Subir export" }).className).toBe(boton);
  });

  it("Una sección sin plan no muestra pasos y conserva su texto", async () => {
    simularApi({ [SECCIONES_2026_1]: json(200, [conPlan({ tiene_plan: false, pi: [] })]), [CARGAS_2026_1]: json(200, []) });
    render(<MisSecciones usuario={usuarioDocente701} periodo="2026-1" {...acciones()} />);
    const tarjeta = within(await screen.findByRole("listitem"));
    expect(tarjeta.getByText(sinPlan, { selector: "p" })).toBeInTheDocument();
    expect(tarjeta.queryByRole("group", { name: CAMINO })).toBeNull();
    expect(tarjeta.queryByText(/Subir el export|Revisar el resultado/)).toBeNull();
    const subir = tarjeta.getByRole("button", { name: "Subir export" });
    expect(subir).toBeDisabled();
    expect(subir).toHaveAccessibleDescription(sinPlan);
  });

  it("La marca del paso no depende solo del color", async () => {
    simularApi({ [SECCIONES_2026_1]: json(200, [seccion701]), [CARGAS_2026_1]: json(200, []) });
    render(<MisSecciones usuario={usuarioDocente701} periodo="2026-1" {...acciones()} />);
    const tarjeta = await screen.findByRole("listitem");
    await within(tarjeta).findByRole("group", { name: CAMINO });
    const pasos = [paso(tarjeta, "1. Subir el export"), paso(tarjeta, "2. Revisar el resultado y descargar el R-17")];
    for (const p of pasos) expect(["Ahora", "Hecho", "Corregir", "Pendiente"]).toContain(marcaDe(p));
    expect(lectorDe(pasos[0])).toBe("Paso 1 de 2, ahora. Subir el export");
    expect(lectorDe(pasos[1])).toBe("Paso 2 de 2, pendiente. Revisar el resultado y descargar el R-17");
    // El lector de pantalla no oye dos veces el número ni la marca, que se ven pero quedan ocultos para él.
    for (const p of pasos) {
      for (const hijo of Array.from(p.children).filter((h) => !h.classList.contains("sr-only"))) {
        expect(hijo).toHaveAttribute("aria-hidden", "true");
      }
    }
  });

  it("La coordinación no recibe los pasos del profesor", async () => {
    const { llamadas } = simularApi({ [SECCIONES_2026_1]: json(200, [seccion701]) });
    render(<MisSecciones usuario={usuarioCoordinacionCurso} periodo="2026-1" {...acciones()} />);
    await screen.findByRole("listitem");
    expect(screen.queryByRole("group", { name: CAMINO })).toBeNull();
    expect(document.querySelector("[data-paso]")).toBeNull();
    expect(llamadas.map((l) => l.clave)).toEqual([SECCIONES_2026_1]);
  });

  it("Ingreso dice el error junto al formulario y conserva el correo", async () => {
    simularApi({ "POST /api/sesion": json(401, { detail: "Correo o contraseña incorrectos." }) });
    const u = userEvent.setup();
    render(<Ingreso alIngresar={vi.fn()} />);
    await u.type(screen.getByLabelText("Correo"), "docente701@example.invalid");
    await u.type(screen.getByLabelText("Contraseña"), "clave-errada");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Correo o contraseña incorrectos.");
    expect(alerta).toAppearBefore(screen.getByRole("button", { name: "Ingresar" }));
    expect(alerta.closest("form")).not.toBeNull();
    expect(screen.getByLabelText("Correo")).toHaveValue("docente701@example.invalid");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("El bloqueo por intentos se muestra sin ocultar el formulario", async () => {
    simularApi({ "POST /api/sesion": json(429, { detail: "Demasiados intentos. Espere 15 minutos." }) });
    const u = userEvent.setup();
    render(<Ingreso alIngresar={vi.fn()} />);
    await u.type(screen.getByLabelText("Correo"), "docente701@example.invalid");
    await u.type(screen.getByLabelText("Contraseña"), "clave-errada");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demasiados intentos. Espere 15 minutos.");
    expect(screen.getByLabelText("Correo")).toBeVisible();
    expect(screen.getByLabelText("Contraseña")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled());
  });

  it("Con movimiento reducido no hay animaciones", async () => {
    simularApi({ [SECCIONES_2026_1]: nunca });
    render(<MisSecciones usuario={usuarioDocente701} periodo="2026-1" {...acciones()} />);
    const espera = await screen.findByRole("status");
    expect(espera).toHaveTextContent("Cargando secciones");
    const indicador = espera.querySelector("[data-indicador]");
    expect(indicador).not.toBeNull();
    // Toda animación del indicador va bajo motion-safe, que Tailwind aplica solo sin prefers-reduced-motion.
    const clases = Array.from(indicador!.classList);
    expect(clases.some((c) => c.startsWith("motion-safe:animate-"))).toBe(true);
    expect(clases.filter((c) => /(^|:)animate-/.test(c) && !c.startsWith("motion-safe:"))).toEqual([]);
    // Y la hoja global apaga toda animación y transición cuando el navegador lo pide.
    const bloque = indexCss.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(bloque?.[1]).toMatch(/animation:\s*none\s*!important/);
    expect(bloque?.[1]).toMatch(/transition:\s*none\s*!important/);
  });

  it("El rediseño no carga recursos de terceros ni dependencias nuevas", () => {
    const deOtroDominio = /(https?:)?\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i;
    // Cuando se construye el Front con npm run build, la revisión incluye su index.html y al menos una hoja de dist/assets.
    const construidos = Object.keys(construccion);
    expect(construidos, "falta dist/, corra npm run build antes de npm test").toContain("../../dist/index.html");
    expect(construidos.filter((r) => r.startsWith("../../dist/assets/") && r.endsWith(".css")).length).toBeGreaterThan(0);
    const fuentes = [indexHtml, indexCss, ...Object.values(construccion)];
    // Una hoja con una fuente de otro dominio sí se detecta.
    expect("@import url(https://fonts.example.invalid/css);").toMatch(new RegExp(`@import\\s+(url\\()?["']?${deOtroDominio.source}`, "i"));
    for (const texto of fuentes) {
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/@font-face/);
      expect(texto).not.toMatch(/<link[^>]+rel="?stylesheet"?[^>]+href="?(https?:)?\/\//i);
      expect(texto).not.toMatch(new RegExp(`@import\\s+(url\\()?["']?${deOtroDominio.source}`, "i"));
      expect(texto).not.toMatch(new RegExp(`url\\(["']?${deOtroDominio.source}`, "i"));
    }
    const paquete = JSON.parse(paqueteTexto);
    expect(Object.keys(paquete.dependencies).sort()).toEqual(["react", "react-dom"]);
    expect(Object.keys(paquete.devDependencies).sort()).toEqual([
      "@playwright/test", "@tailwindcss/vite", "@testing-library/jest-dom", "@testing-library/react",
      "@testing-library/user-event", "@types/react", "@types/react-dom", "@vitejs/plugin-react", "jsdom", "tailwindcss",
      "typescript", "vite", "vitest",
    ]);
    const candado = JSON.parse(candadoTexto).packages[""];
    expect(candado.dependencies).toEqual(paquete.dependencies);
    expect(candado.devDependencies).toEqual(paquete.devDependencies);
  });
});

// El escenario «La tabla de rechazos de P4 se desplaza dentro de su región y no la página» es @playwright y llega con
// T048. Esta prueba fija desde ya la parte que no necesita navegador, la región con su nombre accesible y tabindex 0.
describe("US-82 · Parte de Vitest de la región de la tabla de rechazos (el escenario completo llega con T048)", () => {
  const rechazos = Array.from({ length: 12 }, (_, i) => ({
    fila: i + 2,
    pi: "PI-1.1",
    motivo: "NOTA_FUERA_DE_RANGO",
    efecto: "RECHAZA_FILA" as const,
    mensaje: `Fila ${i + 2}. La nota está fuera de la escala.`,
  }));

  it("La tabla vive en una región con role=\"region\", nombre accesible y tabindex 0", () => {
    render(<TablaRechazos rechazos={rechazos} />);
    const region = screen.getByRole("region", { name: "Tabla de filas rechazadas" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/(^|\s)overflow-x-auto(\s|$)/);
    const tabla = within(region).getByRole("table", { name: "Filas rechazadas" });
    expect(within(tabla).getAllByRole("row")).toHaveLength(13);
  });

  it("Sin rechazos no hay región ni tabla que enfocar", () => {
    const { container } = render(<TablaRechazos rechazos={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("region")).toBeNull();
  });
});
