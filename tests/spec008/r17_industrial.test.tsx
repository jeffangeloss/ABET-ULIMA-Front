import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MisLogros } from "../../src/pantallas/MisLogros";
import type { Resultados, Usuario } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import { indicador, seccionConCarga, usuarioDocente701 } from "../respuestas";

// Escenarios @delegado_a_vitest de US-78 en specs/008-ciclo-quimica-industrial/aceptacion/r17_industrial.feature del
// Back. Cada «it» lleva el título del escenario. Los demás escenarios de US-78 son del Back (R-17 y ruta 12).

const RESULTADOS_2026_1 = "GET /api/resultados?periodo=2026-1";
const SO_6 = { numero: 6, descripcion: "Texto inventado del SO 6 de IND-2026." };

const usuarioDocente702: Usuario = {
  correo: "docente702@example.invalid",
  rol: "PROFESOR",
  alcance: { tipo: "SECCIONES", carreras: [], asignaturas: [] },
};

/** La ruta 12 de una sola sección de 5643 en 2026-1 con el PI 6.1 del «Portafolio 3» y la meta de 80 %. */
function resultadosDe(numero: string, reparto: [number, number, number, number], pct: number, enMeta: boolean): Resultados {
  return {
    periodo: "2026-1",
    so: [SO_6],
    secciones: [
      seccionConCarga(21, "5643", "Química General", numero, 30, [
        indicador(6, "6.1", reparto, pct, enMeta, { instrumento: "Portafolio 3" }),
      ]),
    ],
  };
}

async function abrirP6(usuario: Usuario, resultados: Resultados) {
  const { llamadas } = simularApi({ [RESULTADOS_2026_1]: json(200, resultados) });
  render(<MisLogros usuario={usuario} periodo="2026-1" alVolver={vi.fn()} />);
  const region = await screen.findByRole("region", { name: "SO 6" });
  const [fila, ...otras] = within(region).getAllByRole("listitem");
  expect(otras).toHaveLength(0);
  expect(llamadas.map((l) => l.clave)).toEqual([RESULTADOS_2026_1]);
  return fila;
}

/** La barra del logro como la oye un lector de pantalla, o un error si está oculta o no tiene nombre. */
function barraDelLogro(fila: HTMLElement) {
  const barra = within(fila).getByRole("img");
  // Es la barra del logro, con su tramo lleno y su línea de la meta, y no la del reparto por nivel.
  expect(barra.querySelector('[data-barra="logro"] [data-lleno]')).not.toBeNull();
  expect(barra.querySelector('[data-barra="logro"] [data-meta]')).not.toBeNull();
  return barra.getAttribute("aria-label") ?? "";
}

describe("US-78 · P6 con el SO y el PI de Industrial", () => {
  it("La fila de P6 dice la cifra, la meta y el resultado con palabras", async () => {
    const fila = await abrirP6(usuarioDocente701, resultadosDe("701", [3, 5, 20, 6], 76.5, false));
    expect(screen.getByText((_, el) => el?.tagName === "P" && (el.textContent ?? "").startsWith("Periodo 2026-1."))).toBeInTheDocument();
    expect(fila.querySelector("p")?.textContent).toBe("6.1 · Sección 701 de 5643 · 76,5 % (26 de 34) · Debajo de la meta");
    const etiqueta = barraDelLogro(fila);
    expect(etiqueta).toContain("76,5 %");
    expect(etiqueta).toContain("meta 80 %");
    expect(etiqueta).toContain("debajo de la meta");
    expect(etiqueta).not.toContain("en la meta");
  });

  it("Una sección que llega a la meta lo dice con palabras", async () => {
    const fila = await abrirP6(usuarioDocente702, resultadosDe("702", [1, 3, 20, 6], 86.7, true));
    expect(fila.querySelector("p")?.textContent).toBe("6.1 · Sección 702 de 5643 · 86,7 % (26 de 30) · En la meta");
    // La barra también lo dice con palabras, y no solo con el color verde de su tramo.
    const etiqueta = barraDelLogro(fila);
    expect(etiqueta).toContain("86,7 %");
    expect(etiqueta).toContain("meta 80 %");
    expect(etiqueta).toContain("en la meta");
    expect(etiqueta).not.toContain("debajo");
  });
});
