import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { ResumenCurso, TRAMOS } from "../../src/pantallas/ResumenCurso";
import { COLORES } from "../../src/pantallas/MisLogros";
import { razonDeContraste } from "../../src/servicios/contraste";
import type { ResumenCurso as Respuesta } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  avance5643,
  cursosDeAmbiental,
  cursosDeQuimica,
  indicadorDelResumen61,
  resumen5643,
  seccion704SinCarga,
  seccionDeResumen,
  usuarioCoordinacionCarrera,
  usuarioCoordinacionCurso,
  usuarioDocente701,
} from "../respuestas";

// Escenarios @delegado_a_vitest de US-92 en specs/009-resumen-del-curso/aceptacion/pantalla_resumen_del_curso.feature del
// Back, y los de US-93 que dibuja el selector. Cada «it» lleva el título del escenario. La respuesta simulada es la del
// primer escenario de resumen_del_curso.feature, con la 701 a la 704 de 5643 en 2026-1.

const CURSOS = "GET /api/resumen-curso/cursos?periodo=2026-1";
const RESUMEN = "GET /api/resumen-curso?periodo=2026-1&asignatura=5643";

function conRespuesta(cuerpo: Respuesta = resumen5643) {
  return simularApi({ [CURSOS]: json(200, cursosDeQuimica), [RESUMEN]: json(200, cuerpo) });
}

/** La respuesta de la ruta 20 con otro PI 6.1, sin tocar el resto. */
function con(cambios: Partial<typeof indicadorDelResumen61>): Respuesta {
  return { ...resumen5643, indicadores: [{ ...indicadorDelResumen61, ...cambios }] };
}

/** Las filas de la tabla de secciones, sin el encabezado. */
function filas(): HTMLElement[] {
  return screen.getAllByRole("row").slice(1);
}

describe("US-92 · P8 muestra el resumen del curso", () => {
  it("El tramo debajo del nivel esperado sale de los conteos con el redondeo de PostgreSQL, no de restar a 100", async () => {
    // 1 de 80 da 1,3 % en la API y 79 de 80 da 98,8 % con ROUND(numeric, 1); restar 1,3 a 100 daría 98,7 %.
    const curso = { ...indicadorDelResumen61.curso, estudiantes_por_nivel: [40, 39, 1, 0], logrados: 1, calificados: 80, total: 81, pct_sobre_calificados: 1.3, promedio_nivel: 1.51 };
    conRespuesta(con({ curso }));
    render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByText("Debajo del nivel esperado, 79 alumnos, 98,8 %")).toBeInTheDocument();
    expect(screen.queryByText(/98,7 %/)).toBeNull();
    expect(document.querySelector("[data-tramo='debajo']")).toHaveStyle({ width: "98.8%" });
  });

  it("P8 escribe las cifras del curso con su barra de dos tramos", async () => {
    conRespuesta();
    render(<ResumenCurso periodo="2026-1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Resumen del curso" })).toHaveFocus();
    expect(await screen.findByText("23 de 33 alumnos en el nivel esperado o superior (69,7 %)")).toBeInTheDocument();
    expect(screen.getByText("Promedio de calificación 2,91 de 4")).toBeInTheDocument();
    expect(screen.getByText("1 de 3 secciones publicadas en la meta")).toBeInTheDocument();
    expect(screen.getByText("1 sección sin carga publicada")).toBeInTheDocument();
    expect(screen.getByText("1 alumno sin evidencia, que no entra en el porcentaje ni en el promedio")).toBeInTheDocument();
    // La barra de dos tramos dice con texto lo que dibuja, y el dibujo se oculta al lector de pantalla.
    expect(screen.getByText("Nivel esperado o superior, 23 alumnos, 69,7 %")).toBeInTheDocument();
    expect(screen.getByText("Debajo del nivel esperado, 10 alumnos, 30,3 %")).toBeInTheDocument();
    const barra = document.querySelector("[data-barra='curso']") as HTMLElement;
    expect(barra).toHaveAttribute("aria-hidden", "true");
    expect(barra.querySelector("[data-tramo='esperado']")).toHaveStyle({ width: "69.7%" });
    expect(barra.querySelector("[data-tramo='debajo']")).toHaveStyle({ width: "30.3%" });
    expect(barra.querySelector("[data-meta]")).toHaveStyle({ left: "80%" });
    // El curso con 69,7 % y meta 80 % lo dice con texto, y el título nombra el curso y el PI.
    expect(screen.getByText("Debajo de la meta, meta 80 %")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "PI 6.1 del SO 6" })).toBeInTheDocument();
    expect(screen.getByText("5643 Química General, periodo 2026-1")).toBeInTheDocument();
    // La ruta 21 trae un solo curso, así que no hay selector.
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("P8 trae una fila por sección con su barra y la línea de la meta", async () => {
    conRespuesta();
    render(<ResumenCurso periodo="2026-1" />);
    await screen.findByText("Promedio de calificación 2,91 de 4");
    const tabla = screen.getByRole("table", { name: "Secciones del PI 6.1" });
    expect(within(tabla).getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Sección", "Calificados", "Porcentaje", "Promedio", "Estado",
    ]);
    expect(filas().map((f) => within(f).getByRole("rowheader").textContent)).toEqual(["701", "702", "703", "704"]);

    const [f701, f702, f703, f704] = filas();
    expect(within(f701).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "10", expect.stringContaining("70,0 % (7 de 10)"), "2,90", "Debajo de la meta",
    ]);
    expect(within(f702).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "10", expect.stringContaining("90,0 % (9 de 10)"), "3,30", "En la meta",
    ]);
    expect(within(f703).getAllByRole("cell")[0]).toHaveTextContent("13");
    expect(within(f703).getAllByRole("cell")[0]).toHaveTextContent("1 sin evidencia");
    expect(within(f703).getByText(/53,8 % \(7 de 13\)/)).toBeInTheDocument();
    expect(within(f703).getByText("2,62")).toBeInTheDocument();
    expect(within(f703).getByText("Debajo de la meta")).toBeInTheDocument();

    // Cada barra marca la meta con una línea y con texto, y el dibujo no entra al árbol de accesibilidad.
    for (const [fila, ancho] of [[f701, "70%"], [f702, "90%"], [f703, "53.8%"]] as const) {
      const barra = fila.querySelector("[data-barra='seccion']") as HTMLElement;
      expect(barra).toHaveAttribute("aria-hidden", "true");
      expect(barra.querySelector("[data-lleno]")).toHaveStyle({ width: ancho });
      expect(barra.querySelector("[data-meta]")).toHaveStyle({ left: "80%" });
      expect(within(fila).getByText("Meta 80 %")).toBeInTheDocument();
    }
    // La 702 en la meta y la 701 debajo no se distinguen solo por el color, porque la fila escribe su estado.
    expect(f701.querySelector("[data-lleno]")).toHaveStyle({ backgroundColor: COLORES.debajo });
    expect(f702.querySelector("[data-lleno]")).toHaveStyle({ backgroundColor: COLORES.enMeta });

    // La sección sin carga lo dice y no dibuja una barra de 0 %.
    expect(within(f704).getByText("Sin carga publicada")).toBeInTheDocument();
    expect(f704.querySelector("[data-barra]")).toBeNull();
    expect(within(f704).queryByText(/%/)).toBeNull();
    expect(within(f704).queryByText("Meta 80 %")).toBeNull();
  });

  it("P8 no muestra profesores ni ordena por resultado", async () => {
    conRespuesta(
      con({
        secciones: [
          seccionDeResumen(21, "701", 31, 9, 10, 90.0, 3.3, true),
          seccionDeResumen(22, "702", 32, 7, 13, 53.8, 2.62, false),
          seccionDeResumen(23, "703", 33, 7, 10, 70.0, 2.9, false),
        ],
      }),
    );
    const { container } = render(<ResumenCurso periodo="2026-1" />);
    await screen.findByText("Promedio de calificación 2,91 de 4");
    expect(filas().map((f) => within(f).getByRole("rowheader").textContent)).toEqual(["701", "702", "703"]);
    expect(filas().map((f) => f.querySelector("[data-lleno]")?.getAttribute("style"))).toEqual([
      expect.stringContaining("width: 90%"),
      expect.stringContaining("width: 53.8%"),
      expect.stringContaining("width: 70%"),
    ]);
    // Ninguna celda trae un correo ni un profesor, y no hay torta ni tarjeta de profesores.
    const texto = container.textContent ?? "";
    expect(texto).not.toMatch(/@|example\.invalid/);
    expect(texto).not.toMatch(/profesor|docente/i);
    expect(container.querySelector("svg, canvas, img, [role='img'], [data-torta]")).toBeNull();
    expect(screen.queryByText(/% de profesores/i)).toBeNull();
  });

  it("P8 marca las cifras provisionales", async () => {
    conRespuesta(con({ provisional: true }));
    render(<ResumenCurso periodo="2026-1" />);
    const franja = await screen.findByText(/^Cifras provisionales\./);
    expect(franja).toHaveTextContent("No usar como evidencia oficial.");
    expect(franja).toHaveClass("border-aviso-borde", "bg-aviso-fondo", "text-aviso-texto");
  });

  it("P8 con cifras definitivas no muestra la franja provisional", async () => {
    conRespuesta();
    render(<ResumenCurso periodo="2026-1" />);
    await screen.findByText("Promedio de calificación 2,91 de 4");
    expect(screen.queryByText(/provisionales/)).toBeNull();
  });

  it("P8 de un curso sin cargas no dibuja barras de 0 %", async () => {
    conRespuesta(
      con({
        curso: {
          estudiantes_por_nivel: [0, 0, 0, 0], logrados: 0, calificados: 0, sin_evidencia: 0, total: 0,
          pct_sobre_calificados: null, promedio_nivel: null, en_meta: null,
        },
        conteo_secciones: { total: 4, publicadas: 0, en_meta: 0, debajo_de_la_meta: 0, sin_dato: 4 },
        secciones: ["701", "702", "703", "704"].map((n, i) => ({ ...seccion704SinCarga, seccion_id: 21 + i, numero: n })),
      }),
    );
    const { container } = render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByText("Todavía no hay cargas publicadas en este curso.")).toBeInTheDocument();
    expect(container.querySelector("[data-barra]")).toBeNull();
    expect(container.textContent).not.toMatch(/0,0 %|\b0 %/);
    expect(screen.queryByText(/alumnos en el nivel esperado/)).toBeNull();
    expect(screen.queryByText(/Promedio de calificación/)).toBeNull();
    // Las cuatro secciones siguen en la tabla, cada una sin carga publicada.
    expect(filas().map((f) => within(f).getByRole("rowheader").textContent)).toEqual(["701", "702", "703", "704"]);
    expect(screen.getAllByText("Sin carga publicada")).toHaveLength(4);
  });

  it("P8 escribe lo que no se mide en lugar de dibujarlo", async () => {
    // Con metas distintas el curso trae la meta y su estado en null, y con el nivel esperado sin definir no hay porcentaje.
    conRespuesta(con({ meta_pct: null, curso: { ...indicadorDelResumen61.curso, en_meta: null } }));
    const { container, unmount } = render(<ResumenCurso periodo="2026-1" />);
    await screen.findByText("Promedio de calificación 2,91 de 4");
    expect(screen.getByText("Sin meta definida")).toBeInTheDocument();
    expect(container.querySelector("[data-barra='curso'] [data-meta]")).toBeNull();
    unmount();

    conRespuesta(
      con({
        nivel_esperado: null, meta_pct: null,
        curso: { ...indicadorDelResumen61.curso, logrados: 0, pct_sobre_calificados: null, promedio_nivel: null, en_meta: null },
        secciones: [seccionDeResumen(21, "701", 31, 0, 10, 0, 0, false, { pct_sobre_calificados: null, promedio_nivel: null, en_meta: null, logrados: null })],
      }),
    );
    const otra = render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByText("Sin nivel esperado definido")).toBeInTheDocument();
    expect(otra.container.querySelector("[data-barra]")).toBeNull();
    expect(otra.container.textContent).not.toMatch(/NaN|null|undefined/);
  });

  it("P8 de un curso fuera del alcance lo dice sin revelar si existe", async () => {
    conRespuesta({ ...resumen5643, indicadores: [] });
    render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByText("No hay cifras de este curso en este periodo para su cuenta.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("P8 sin periodo no pide nada y lo dice", () => {
    const { llamadas } = simularApi({});
    render(<ResumenCurso />);
    expect(screen.getByText("Elija un periodo para ver el resumen del curso.")).toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it("P8 muestra el error de la ruta 20 con su detail y ninguna cifra", async () => {
    simularApi({
      [CURSOS]: json(200, cursosDeQuimica),
      [RESUMEN]: json(403, { detail: "Esta página es de la Coordinación." }),
    });
    render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Esta página es de la Coordinación.");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("P8 no guarda nada en el almacenamiento del navegador", async () => {
    conRespuesta();
    render(<ResumenCurso periodo="2026-1" />);
    await screen.findByText("Promedio de calificación 2,91 de 4");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("Los colores de los dos tramos contrastan 3 a 1 con el fondo y entre sí", () => {
    expect(razonDeContraste(TRAMOS.esperado, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(razonDeContraste(TRAMOS.debajo, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(razonDeContraste(TRAMOS.esperado, TRAMOS.debajo)).toBeGreaterThanOrEqual(1.5);
  });
});

describe("US-93 · La coordinación elige el curso", () => {
  const DOS_CURSOS = "GET /api/resumen-curso/cursos?periodo=2026-2";
  const resumen = (codigo: string, nombre: string): Respuesta => ({ ...resumen5643, periodo: "2026-2", asignatura: { codigo, nombre } });

  it("El selector de curso aparece con dos cursos y cada elección pide su resumen", async () => {
    const { llamadas } = simularApi({
      [DOS_CURSOS]: json(200, cursosDeAmbiental),
      "GET /api/resumen-curso?periodo=2026-2&asignatura=450002": json(200, resumen("450002", "Principios de Ingeniería Sostenible")),
      "GET /api/resumen-curso?periodo=2026-2&asignatura=450010": json(200, resumen("450010", "Gestión Sostenible de Residuos")),
    });
    const u = userEvent.setup();
    render(<ResumenCurso periodo="2026-2" />);
    const selector = await screen.findByRole("combobox", { name: "Curso" });
    expect(within(selector).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "450002 Principios de Ingeniería Sostenible",
      "450010 Gestión Sostenible de Residuos",
    ]);
    expect(await screen.findByText("450002 Principios de Ingeniería Sostenible, periodo 2026-2")).toBeInTheDocument();
    await u.selectOptions(selector, "450010");
    expect(await screen.findByText("450010 Gestión Sostenible de Residuos, periodo 2026-2")).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toEqual([
      DOS_CURSOS,
      "GET /api/resumen-curso?periodo=2026-2&asignatura=450002",
      "GET /api/resumen-curso?periodo=2026-2&asignatura=450010",
    ]);
  });

  it("Un curso que llega desde P7 y no está en la ruta 21 queda elegido en el selector, y otra elección cambia de curso", async () => {
    const alCambiarCurso = vi.fn();
    simularApi({
      [DOS_CURSOS]: json(200, cursosDeAmbiental),
      "GET /api/resumen-curso?periodo=2026-2&asignatura=450099": json(200, resumen("450099", "Curso Inventado Fuera de la Lista")),
    });
    const u = userEvent.setup();
    render(<ResumenCurso periodo="2026-2" asignaturaInicial="450099" alCambiarCurso={alCambiarCurso} />);
    expect(await screen.findByText("450099 Curso Inventado Fuera de la Lista, periodo 2026-2")).toBeInTheDocument();
    const selector = (await screen.findByRole("combobox", { name: "Curso" })) as HTMLSelectElement;
    expect(selector.value).toBe("450099");
    expect(within(selector).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "450099 Curso Inventado Fuera de la Lista",
      "450002 Principios de Ingeniería Sostenible",
      "450010 Gestión Sostenible de Residuos",
    ]);
    await u.selectOptions(selector, "450010");
    expect(alCambiarCurso).toHaveBeenCalledWith("450010");
  });

  it("Un curso de la lista que llega desde P7 se abre sin esperar la ruta 21", async () => {
    // La ruta 21 en 500 deja a P8 sin selector, pero con el curso que trae el enlace.
    simularApi({ [CURSOS]: json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }), [RESUMEN]: json(200, resumen5643) });
    render(<ResumenCurso periodo="2026-1" asignaturaInicial="5643" />);
    expect(await screen.findByText("Promedio de calificación 2,91 de 4")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Sin curso de P7 y con la ruta 21 en error, P8 muestra el error", async () => {
    simularApi({ [CURSOS]: json(403, { detail: "Esta página es de la Coordinación." }) });
    render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Esta página es de la Coordinación.");
  });

  it("La coordinación sin cursos con plan lo lee con texto", async () => {
    simularApi({ [CURSOS]: json(200, { periodo: "2026-1", cursos: [] }) });
    render(<ResumenCurso periodo="2026-1" />);
    expect(await screen.findByText("No hay cursos con plan de medición en este periodo para su cuenta.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});

describe("US-92 · El menú y P7 llevan a P8 solo para la coordinación", () => {
  const SESION = "GET /api/sesion";
  const PERIODOS = "GET /api/periodos";
  const AVANCE = "GET /api/avance?periodo=2026-1";
  const UN_PERIODO = { vigente: "2026-2", periodos: ["2026-1"] };

  it("Solo la coordinación ve el enlace al resumen del curso en el menú", async () => {
    simularApi({
      [SESION]: json(200, usuarioCoordinacionCurso),
      [PERIODOS]: json(200, UN_PERIODO),
      [AVANCE]: json(200, avance5643),
    });
    const { unmount } = render(<App />);
    const menu = within(await screen.findByRole("navigation", { name: "Menú principal" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Avance del registro del curso",
      "Resumen del curso",
      "Secciones del curso",
      "Cargas",
      "Ver los logros por SO del curso",
    ]);
    unmount();

    const { llamadas } = simularApi({
      [SESION]: json(200, usuarioDocente701),
      [PERIODOS]: json(200, UN_PERIODO),
      "GET /api/secciones?periodo=2026-1": json(200, []),
    });
    render(<App />);
    const menuDelProfesor = within(await screen.findByRole("navigation", { name: "Menú principal" }));
    expect(menuDelProfesor.queryByRole("button", { name: "Resumen del curso" })).toBeNull();
    expect(llamadas.map((l) => l.clave).filter((c) => c.includes("resumen-curso"))).toEqual([]);
  });

  it("P7 de la coordinación enlaza cada curso con su P8", async () => {
    const { llamadas } = simularApi({
      [SESION]: json(200, usuarioCoordinacionCurso),
      [PERIODOS]: json(200, UN_PERIODO),
      [AVANCE]: json(200, avance5643),
      [CURSOS]: json(200, cursosDeQuimica),
      [RESUMEN]: json(200, resumen5643),
    });
    const u = userEvent.setup();
    render(<App />);
    const curso = await screen.findByRole("region", { name: "5643 Química General" });
    await u.click(within(curso).getByRole("button", { name: "Ver el resumen del curso" }));
    expect(await screen.findByText("23 de 33 alumnos en el nivel esperado o superior (69,7 %)")).toBeInTheDocument();
    const menu = within(screen.getByRole("navigation", { name: "Menú principal" }));
    expect(menu.getByRole("button", { name: "Resumen del curso", current: "page" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/resumen?asignatura=5643");
    const pedidas = llamadas.map((l) => l.clave);
    expect(pedidas.slice(0, 3)).toEqual([SESION, PERIODOS, AVANCE]);
    // Con el curso que trae el enlace, la ruta 20 no espera a la 21.
    expect(pedidas.slice(3).sort()).toEqual([CURSOS, RESUMEN].sort());
  });

  it("P8 abierta desde el menú sin periodo elegido lo dice y no pide nada", async () => {
    const { llamadas } = simularApi({
      [SESION]: json(200, usuarioCoordinacionCarrera),
      [PERIODOS]: json(200, { vigente: "2026-2", periodos: [] }),
      "GET /api/avance": json(200, { ...avance5643, secciones: [], conteo: { ...avance5643.conteo, secciones: 0 } }),
      "GET /api/resumen-curso/cursos": json(200, cursosDeAmbiental),
      "GET /api/resumen-curso?asignatura=450002": json(200, resumen5643),
    });
    // La ruta 18 sin periodos deja a la API sin periodo elegido, y P8 lo dice sin pedir nada.
    const u = userEvent.setup();
    render(<App />);
    const menu = within(await screen.findByRole("navigation", { name: "Menú principal" }));
    await u.click(menu.getByRole("button", { name: "Resumen del curso" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Resumen del curso" })).toBeInTheDocument();
    expect(screen.getByText("Elija un periodo para ver el resumen del curso.")).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave).filter((c) => c.includes("resumen-curso"))).toEqual([]);
  });

  it("El fragmento #/resumen abre P8 de la coordinación y cae a la llegada con la cuenta del profesor", async () => {
    window.history.replaceState(null, "", "#/resumen");
    const abierta = simularApi({
      [SESION]: json(200, usuarioCoordinacionCurso),
      [PERIODOS]: json(200, UN_PERIODO),
      [CURSOS]: json(200, cursosDeQuimica),
      [RESUMEN]: json(200, resumen5643),
    });
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Resumen del curso" })).toBeInTheDocument();
    await screen.findByText("Promedio de calificación 2,91 de 4");
    // Sin un curso que venga de P7, la ruta 21 se pide primero y la 20 después.
    expect(abierta.llamadas.map((l) => l.clave).slice(2)).toEqual([CURSOS, RESUMEN]);
    unmount();

    window.history.replaceState(null, "", "#/resumen");
    const { llamadas } = simularApi({
      [SESION]: json(200, usuarioDocente701),
      [PERIODOS]: json(200, UN_PERIODO),
      "GET /api/secciones?periodo=2026-1": json(200, []),
    });
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave).filter((c) => c.includes("resumen-curso"))).toEqual([]);
  });
});
