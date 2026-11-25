import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import { json, simularApi } from "../ayudas";
import {
  avance5643,
  constanciaPublicada701,
  seccion701,
  seccionQuimica,
  usuarioCoordinacionCurso,
} from "../respuestas";

// Escenarios @delegado_a_vitest de US-79 en specs/008-ciclo-quimica-industrial/aceptacion/avance_del_curso.feature del
// Back. Cada «it» lleva el título exacto del escenario, que anotan los pasos de pytest-bdd del Back. La API simulada corre
// con PERIODO_VIGENTE 2026-2 y la ruta 18 deja a la coordinación del curso en 2026-1 (contrato, secciones 15.2 y 15.5).

const UN_PERIODO = { vigente: "2026-2", periodos: ["2026-1"] };
const AVANCE_2026_1 = "GET /api/avance?periodo=2026-1";
const QUIMICA = "5643 Química General";

function sesionDelCurso(extra: Record<string, ReturnType<typeof json>> = {}) {
  return simularApi({
    "GET /api/sesion": json(200, usuarioCoordinacionCurso),
    "GET /api/periodos": json(200, UN_PERIODO),
    [AVANCE_2026_1]: json(200, avance5643),
    ...extra,
  });
}

describe("US-79 · La ruta 17 y P7 alcanzan a la coordinación del curso", () => {
  it("P7 lleva el título del curso y es la llegada de su coordinación", async () => {
    const { llamadas } = sesionDelCurso();
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Avance del registro del curso" })).toBeInTheDocument();
    expect(await screen.findByText("1 de 4 secciones con carga publicada.")).toHaveAttribute("role", "status");
    const curso = screen.getByRole("region", { name: QUIMICA });
    expect(within(curso).getAllByRole("listitem").map((li) => within(li).getByText(/^\d{3} · /).textContent)).toEqual([
      "701 · Publicada",
      "702 · La última carga se rechazó",
      "703 · Sin carga",
      "704 · Sin profesor asignado",
    ]);
    // El menú del curso empieza por P7, marcada como la pantalla actual, y no habla de la carrera. Cambio del 2026-11-24 (spec 009,
    // T031), «Resumen del curso» sigue a P7.
    const menu = within(screen.getByRole("navigation", { name: "Menú principal" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Avance del registro del curso",
      "Resumen del curso",
      "Secciones del curso",
      "Cargas",
      "Ver los logros por SO del curso",
    ]);
    expect(menu.getByRole("button", { current: "page" })).toHaveTextContent("Avance del registro del curso");
    expect(screen.queryByText(/de la carrera/)).toBeNull();
    // Sin secciones SIN_PLAN no hay línea del plan, y la llegada no pide P2.
    expect(screen.queryByText(/sin plan de medición/)).toBeNull();
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/sesion", "GET /api/periodos", AVANCE_2026_1]);
  });

  it("Desde P7 la coordinación abre la carga publicada de una sección", async () => {
    // La ruta 13 de la spec 005 en 404, como un Back anterior, conserva el enlace del R-17 de esta prueba (AD-28).
    const { llamadas } = sesionDelCurso({
      "GET /api/cargas/31": json(200, constanciaPublicada701),
      "GET /api/cargas/31/indicadores": json(404, { detail: "Not Found" }),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByText(/con carga publicada/);
    const fila701 = screen.getByText("701 · Publicada").closest("li")!;
    await u.click(within(fila701).getByRole("button", { name: "Ver la carga" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeInTheDocument();
    const constancia = await screen.findByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("sintetico_20261_5643_701.xlsx");
    expect(await screen.findByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/31/r17.xlsx");
    expect(llamadas.map((l) => l.clave)).toContain("GET /api/cargas/31");
    // Las filas sin carga publicada no ofrecen abrir una carga.
    expect(llamadas.map((l) => l.clave).filter((c) => c.startsWith("GET /api/cargas/"))).toEqual([
      "GET /api/cargas/31",
      "GET /api/cargas/31/indicadores",
    ]);
  });

  // La versión sin P7 es la de b2369c4, así que este «it» prueba P2 tal como ya la ve la coordinación del curso, y pasa
  // también antes de T046. Guarda que P7 no cambie lo que P2 dice de cada sección (FR-014).
  it("Sin la etapa B, la coordinación del curso sigue el avance en P2", async () => {
    simularApi({
      "GET /api/secciones?periodo=2026-1": json(200, [
        { ...seccion701, estado: "PUBLICADA", carga_id: 31, filas_leidas: 11, filas_aceptadas: 10 },
        seccionQuimica(22, "702"),
        seccionQuimica(23, "703"),
        seccionQuimica(24, "704"),
      ]),
    });
    render(<MisSecciones usuario={usuarioCoordinacionCurso} periodo="2026-1" alSubir={vi.fn()} alVerResultado={vi.fn()} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Secciones del curso" })).toBeInTheDocument();
    const estados = (await screen.findAllByRole("listitem")).map(
      (li) => within(li).getByText(/^(Sin carga|Publicada, \d+ de \d+ filas aceptadas)$/).textContent,
    );
    expect(estados).toEqual(["Publicada, 10 de 11 filas aceptadas", "Sin carga", "Sin carga", "Sin carga"]);
    expect(screen.queryByRole("button", { name: "Subir export" })).toBeNull();
  });
});
