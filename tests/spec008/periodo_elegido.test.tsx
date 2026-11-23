import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";
import { json, simularApi, type Respuesta } from "../ayudas";
import {
  cargaRechazada701,
  constanciaLimpia,
  resultadosQuimica,
  seccion701,
  seccionPublicada,
  seccionQuimica,
  usuarioCoordinacionCurso,
  usuarioDocente701,
} from "../respuestas";

// Escenarios @delegado_a_vitest de US-73 en specs/008-ciclo-quimica-industrial/aceptacion/periodo_elegido.feature del
// Back. Cada «it» lleva el título exacto del escenario, que anotan los pasos de pytest-bdd del Back. La API simulada
// corre con PERIODO_VIGENTE 2026-2, como la de los escenarios del Back.

const UN_PERIODO = { vigente: "2026-2", periodos: ["2026-1"] };
const DOS_PERIODOS = { vigente: "2026-2", periodos: ["2026-2", "2026-1"] };

function claves(llamadas: { clave: string }[]): string[] {
  return llamadas.map((l) => l.clave);
}

function contar(llamadas: { clave: string }[], clave: string): number {
  return llamadas.filter((l) => l.clave === clave).length;
}

describe("US-73 · Cada cuenta elige el periodo que trabaja", () => {
  it("Sin secciones en el periodo vigente, P2 abre en el periodo más reciente con secciones", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, UN_PERIODO),
      "GET /api/secciones?periodo=2026-1": json(200, [seccion701]),
      "GET /api/cargas?periodo=2026-1": json(200, []),
    });
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    expect(fila).toHaveTextContent("5643 Química General, sección 701, 2026-1");
    const cabecera = within(screen.getByRole("banner"));
    expect(cabecera.getByText("Periodo 2026-1")).toBeInTheDocument();
    expect(cabecera.queryByRole("combobox")).toBeNull();
    expect(claves(llamadas)).toContain("GET /api/secciones?periodo=2026-1");
    expect(claves(llamadas)).not.toContain("GET /api/secciones");
  });

  it("Con dos periodos la cabecera ofrece el selector y abre en el vigente", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, DOS_PERIODOS),
      "GET /api/secciones?periodo=2026-2": json(200, [seccionPublicada]),
      "GET /api/cargas?periodo=2026-2": json(200, []),
    });
    render(<App />);
    await screen.findAllByRole("listitem");
    const selector = within(screen.getByRole("banner")).getByRole("combobox", { name: "Periodo" });
    expect(selector).toHaveValue("2026-2");
    expect(within(selector).getAllByRole("option").map((o) => o.textContent)).toEqual(["2026-2", "2026-1"]);
    expect(claves(llamadas)).toContain("GET /api/secciones?periodo=2026-2");
    expect(claves(llamadas)).not.toContain("GET /api/secciones");
  });

  it("Cambiar el periodo vuelve a pedir P2, P5 y P6 con el periodo elegido", async () => {
    let soltarLogros: (r: Respuesta) => void = () => undefined;
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, DOS_PERIODOS),
      "GET /api/secciones?periodo=2026-2": json(200, [seccionPublicada]),
      "GET /api/cargas?periodo=2026-2": json(200, []),
      "GET /api/secciones?periodo=2026-1": json(200, [seccion701]),
      "GET /api/cargas?periodo=2026-1": json(200, []),
      "GET /api/resultados?periodo=2026-1": () => new Promise<Respuesta>((soltar) => (soltarLogros = soltar)),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByText("450002 Principios de Ingeniería Sostenible, sección 410, 2026-2");
    const cabecera = within(screen.getByRole("banner"));
    await u.selectOptions(cabecera.getByRole("combobox", { name: "Periodo" }), "2026-1");
    expect(await screen.findByText("5643 Química General, sección 701, 2026-1")).toBeInTheDocument();
    expect(contar(llamadas, "GET /api/secciones?periodo=2026-1")).toBe(1);
    expect(contar(llamadas, "GET /api/cargas?periodo=2026-1")).toBe(1);

    await u.click(cabecera.getByRole("button", { name: "Cargas" }));
    expect(await screen.findByRole("heading", { level: 2, name: "5643 Química General, sección 701, 2026-1" })).toBeInTheDocument();
    expect(contar(llamadas, "GET /api/secciones?periodo=2026-1")).toBe(2);
    expect(contar(llamadas, "GET /api/cargas?periodo=2026-1")).toBe(2);

    await u.click(cabecera.getByRole("button", { name: "Ver mis logros por SO" }));
    expect(await screen.findByText("Cargando sus logros…")).toBeInTheDocument();
    expect(claves(llamadas)).toContain("GET /api/resultados?periodo=2026-1");
    soltarLogros(json(200, resultadosQuimica));
    expect(await screen.findByText("No tiene secciones asignadas en este periodo.")).toBeInTheDocument();
    expect(claves(llamadas).filter((c) => !c.includes("periodo=") && c !== "GET /api/sesion")).toEqual(["GET /api/periodos"]);
  });

  it("La marca de la última carga rechazada de P2 sale del periodo elegido", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, UN_PERIODO),
      "GET /api/secciones?periodo=2026-1": json(200, [seccion701]),
      "GET /api/cargas?periodo=2026-1": json(200, [cargaRechazada701]),
    });
    render(<App />);
    expect(
      await screen.findByText("La última carga se rechazó y no se publicó. Falta subir un export corregido."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver por qué se rechazó" })).toBeInTheDocument();
    expect(claves(llamadas)).not.toContain("GET /api/cargas");
  });

  it("El periodo elegido se conserva en el recorrido y no se guarda en el navegador", async () => {
    const constancia701 = {
      ...constanciaLimpia,
      carga_id: 31,
      seccion: { seccion_id: 21, asignatura: "5643", numero: "701", periodo: "2026-1" },
      nombre_archivo: "sintetico_20261_5643_701.xlsx",
    };
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, DOS_PERIODOS),
      "GET /api/secciones?periodo=2026-2": json(200, [seccionPublicada]),
      "GET /api/cargas?periodo=2026-2": json(200, []),
      "GET /api/secciones?periodo=2026-1": json(200, [seccion701]),
      "GET /api/cargas?periodo=2026-1": json(200, []),
      "POST /api/secciones/21/cargas": json(201, constancia701),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByText("450002 Principios de Ingeniería Sostenible, sección 410, 2026-2");
    await u.selectOptions(screen.getByRole("combobox", { name: "Periodo" }), "2026-1");
    const fila = (await screen.findByText("5643 Química General, sección 701, 2026-1")).closest("li") as HTMLElement;
    await u.click(within(fila).getByRole("button", { name: "Subir export" }));
    await u.upload(
      await screen.findByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"),
      new File(["x"], "sintetico_20261_5643_701.xlsx"),
    );
    await u.click(screen.getByRole("button", { name: "Subir" }));
    await screen.findByRole("heading", { level: 1, name: "Resultado de la carga" });
    await u.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    expect(await screen.findByText("5643 Química General, sección 701, 2026-1")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Periodo" })).toHaveValue("2026-1");
    expect(claves(llamadas).filter((c) => c.startsWith("GET /api/secciones")).at(-1)).toBe("GET /api/secciones?periodo=2026-1");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("Si la ruta 18 falla, P2 usa el periodo vigente como hoy y no muestra error", async () => {
    // La ruta 18 responde 500 solo cuando la prueba la suelta, para comprobar que P2 la pide y espera su respuesta.
    let soltarPeriodos: (r: Respuesta) => void = () => undefined;
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": () => new Promise<Respuesta>((soltar) => (soltarPeriodos = soltar)),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, []),
    });
    render(<App />);
    await waitFor(() => expect(claves(llamadas)).toContain("GET /api/periodos"));
    expect(claves(llamadas)).not.toContain("GET /api/secciones");
    soltarPeriodos(json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }));
    expect(await screen.findByText("450002 Principios de Ingeniería Sostenible, sección 410, 2026-2")).toBeInTheDocument();
    expect(contar(llamadas, "GET /api/periodos")).toBe(1);
    expect(claves(llamadas).indexOf("GET /api/periodos")).toBeLessThan(claves(llamadas).indexOf("GET /api/secciones"));
    expect(claves(llamadas).some((c) => c.includes("periodo="))).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Ocurrió un error interno. Intente de nuevo.")).toBeNull();
    expect(within(screen.getByRole("banner")).queryByText(/^Periodo/)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("En un periodo sin secciones, P2 remite al selector", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioDocente701),
      "GET /api/periodos": json(200, DOS_PERIODOS),
      "GET /api/secciones?periodo=2026-2": json(200, []),
    });
    render(<App />);
    const vacia = await screen.findByText("No tiene secciones asignadas en este periodo.");
    const remite = screen.getByText("Elija otro periodo en la cabecera si dictó una sección con medición ABET en otro ciclo.");
    expect(vacia.nextElementSibling).toBe(remite);
  });

  // Este «it» prueba la parte de P2, P5 y P6 del escenario, que queda parcial hasta T046. P7 y la ruta 17 con
  // periodo=2026-1 llegan con T046 de la spec 008 en el «it.todo» siguiente (cambio del 2026-11-23).
  it("La coordinación del curso trabaja 2026-1 en P2, P5, P6 y P7", async () => {
    const secciones = [seccion701, seccionQuimica(22, "702"), seccionQuimica(23, "703"), seccionQuimica(24, "704")];
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioCoordinacionCurso),
      "GET /api/periodos": json(200, UN_PERIODO),
      "GET /api/secciones?periodo=2026-1": json(200, secciones),
      "GET /api/cargas?periodo=2026-1": json(200, []),
      "GET /api/resultados?periodo=2026-1": json(200, resultadosQuimica),
    });
    const u = userEvent.setup();
    render(<App />);
    expect(await screen.findAllByRole("listitem")).toHaveLength(4);
    const cabecera = within(screen.getByRole("banner"));
    await u.click(cabecera.getByRole("button", { name: "Cargas" }));
    expect(await screen.findByRole("heading", { level: 2, name: "5643 Química General, sección 704, 2026-1" })).toBeInTheDocument();
    await u.click(cabecera.getByRole("button", { name: "Ver los logros por SO del curso" }));
    expect(await screen.findByText("El curso no tiene secciones en este periodo.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Logros por SO del curso" })).toBeInTheDocument();
    const pedidas = claves(llamadas).filter((c) => c !== "GET /api/sesion" && c !== "GET /api/periodos");
    expect(pedidas.length).toBeGreaterThan(0);
    expect(pedidas.every((c) => c.endsWith("periodo=2026-1"))).toBe(true);
    expect(pedidas).toEqual(expect.arrayContaining([
      "GET /api/secciones?periodo=2026-1",
      "GET /api/cargas?periodo=2026-1",
      "GET /api/resultados?periodo=2026-1",
    ]));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it.todo("La coordinación del curso trabaja 2026-1 en P2, P5, P6 y P7 (P7 pide la ruta 17 con periodo=2026-1)");
});
