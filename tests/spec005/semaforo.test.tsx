// Escenarios @delegado_a_vitest de US-46 en specs/005-oportunidades-de-mejora/aceptacion/semaforo.feature del Back. Cada
// «it» lleva el título exacto del escenario, y cada esquema suma entre paréntesis el valor de su fila de Ejemplos.
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import type { Constancia, IndicadoresCarga, Mejora } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import { constanciaConError, constanciaReemplazada, constanciaSinColumna } from "../respuestas";
import { indicadores410, indicadores410SinNotas53, mejoraVacia } from "../respuestas_mejora";

const constancia410: Constancia = { ...constanciaConError, carga_id: 7 };

function montar(indicadores: IndicadoresCarga | number, mejora: Mejora = mejoraVacia) {
  const api = simularApi({
    "GET /api/cargas/7/indicadores": typeof indicadores === "number" ? json(indicadores, { detail: "Not Found" }) : json(200, indicadores),
    "GET /api/cargas/7/mejora": json(200, mejora),
  });
  render(<ResultadoCarga cargaId={7} rol="PROFESOR" constanciaInicial={constancia410} alVolver={vi.fn()} />);
  return api;
}

async function seccionComoVa() {
  return screen.findByRole("region", { name: "Cómo va su sección" });
}

/** Fila de la tabla del semáforo de un PI. */
function fila(region: HTMLElement, pi: string) {
  const tr = within(region).getByRole("rowheader", { name: pi }).closest("tr");
  if (!tr) throw new Error(`Sin la fila de ${pi}`);
  return tr;
}

describe("US-46 · Ver el semáforo en P4 al terminar la carga", () => {
  it("P4 muestra la tabla de niveles con un estado por PI", async () => {
    montar(indicadores410);
    const region = await seccionComoVa();
    const tabla = within(region).getByRole("table");
    const encabezados = within(tabla).getAllByRole("columnheader").map((th) => th.textContent);
    expect(encabezados).toEqual([
      "PI", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Logran / calificados", "% sobre el total", "Logro", "Meta", "Estado",
    ]);
    expect(within(tabla).getAllByRole("row")).toHaveLength(4);
    for (const pi of ["5.1", "5.2"]) {
      const tr = fila(region, pi);
      expect(tr).toHaveTextContent("7 de 11");
      expect(tr).toHaveTextContent("63,6 %");
      expect(tr).toHaveTextContent("Debajo de la meta");
    }
    const tr53 = fila(region, "5.3");
    expect(tr53).toHaveTextContent("8 de 11");
    expect(tr53).toHaveTextContent("72,7 %");
    expect(tr53).toHaveTextContent("Debajo de la meta");
    expect(within(tr53).getAllByRole("cell").slice(0, 4).map((td) => td.textContent)).toEqual(["1", "2", "5", "3"]);
    const luces = region.querySelectorAll("[data-luz]");
    expect(luces).toHaveLength(3);
    luces.forEach((luz) => expect(luz).toHaveAttribute("aria-hidden", "true"));
    // Lo que no debe pasar: P4 no calcula el semáforo, así que no muestra «En la meta» en ningún PI ROJO.
    expect(region).not.toHaveTextContent("En la meta");
    // El hallazgo y el tipo encabezan el bloque de cada PI, no la tabla.
    expect(tabla).not.toHaveTextContent("Oportunidad de mejora");
    expect(tabla).not.toHaveTextContent("Satisfactorio o más");
  });

  it.each([
    { corte: null, leyenda: "Verde, el logro alcanza la meta de 80 %. Rojo, todavía no la alcanza." },
    { corte: 75.0, leyenda: "Verde, desde la meta de 80 %. Ámbar, desde 75 % hasta debajo de la meta. Rojo, debajo de 75 %." },
  ])("La leyenda sale de la respuesta ($corte)", async ({ corte, leyenda }) => {
    montar({ ...indicadores410, corte_rojo_pct: corte });
    const region = await seccionComoVa();
    expect(within(region).getByText(leyenda)).toBeInTheDocument();
    const otra = corte === null ? /Ámbar/ : /todavía no la alcanza/;
    expect(within(region).queryByText(otra)).toBeNull();
  });

  it.each([
    { valor: "verdadero", provisional: true },
    { valor: "falso", provisional: false },
  ])("La franja provisional depende de la respuesta ($valor)", async ({ provisional }) => {
    montar({ ...indicadores410, provisional });
    const region = await seccionComoVa();
    const franja = within(region).queryByText(/^Resultados provisionales\./);
    if (provisional) {
      expect(franja).toHaveTextContent(
        "Resultados provisionales. Las reglas de la carrera (conjunto R-2026-BORRADOR) aún no están aprobadas. No usar como evidencia oficial.",
      );
      expect(franja!.compareDocumentPosition(within(region).getByRole("table")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } else {
      expect(franja).toBeNull();
    }
  });

  it("Un PI sin dato no se pinta como 0 % ni en rojo", async () => {
    montar(indicadores410SinNotas53);
    const region = await seccionComoVa();
    const tr = fila(region, "5.3");
    expect(tr).toHaveTextContent("Sin calificaciones (11 sin evidencia)");
    const celdas = within(tr).getAllByRole("cell").map((c) => c.textContent);
    // «% sobre el total» y «Logro» no escriben ninguna cifra, y ninguna celda dice 0 % ni 0,0 %.
    expect(celdas.slice(5, 7)).toEqual(["Sin dato", "Sin dato"]);
    expect(celdas.join(" ")).not.toMatch(/(^| )0(,0)? %/);
    const luz = tr.querySelector("[data-luz]");
    expect(luz).toHaveAttribute("data-luz", "SIN_DATO");
    expect(luz?.className).not.toMatch(/error/);
    expect(tr.querySelector("[data-barra]")).toBeNull();
    // Los PI con cifras siguen con su estado.
    expect(fila(region, "5.1")).toHaveTextContent("Debajo de la meta");
  });

  it("P4 de una carga no publicada no pide el semáforo", async () => {
    for (const constancia of [constanciaSinColumna, constanciaReemplazada]) {
      const { llamadas } = simularApi({});
      const { unmount } = render(
        <ResultadoCarga cargaId={constancia.carga_id} rol="PROFESOR" constanciaInicial={constancia} alVolver={vi.fn()} />,
      );
      expect(await screen.findByText(/no tiene R-17\.$/)).toBeInTheDocument();
      await new Promise((r) => setTimeout(r, 20));
      expect(llamadas.filter((l) => /indicadores|mejora/.test(l.clave))).toHaveLength(0);
      expect(screen.queryByRole("region", { name: "Cómo va su sección" })).toBeNull();
      expect(screen.queryByRole("region", { name: "Análisis por indicador" })).toBeNull();
      unmount();
    }
  });

  it("Con un Back anterior, P4 se comporta como hoy", async () => {
    const { llamadas } = montar(404);
    expect(await screen.findByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/7/r17.xlsx");
    expect(screen.queryByRole("region", { name: "Cómo va su sección" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Análisis por indicador" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descargar R-17" })).toBeNull();
    // Con la ruta 13 en 404 no pide la 14.
    await waitFor(() => expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/cargas/7/indicadores"]));
  });

  it("un error de la ruta 13 que no es 404 lo dice y no ofrece el R-17", async () => {
    simularApi({ "GET /api/cargas/7/indicadores": json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }) });
    render(<ResultadoCarga cargaId={7} rol="PROFESOR" constanciaInicial={constancia410} alVolver={vi.fn()} />);
    expect(await screen.findByText("Ocurrió un error interno. Intente de nuevo.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(screen.getByRole("button", { name: "Descargar R-17" })).toBeDisabled();
  });
});
