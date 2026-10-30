import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvisosCarga } from "../../src/componentes/AvisosCarga";
import { Mensaje } from "../../src/componentes/Mensaje";
import { TablaRechazos } from "../../src/componentes/TablaRechazos";

describe("Mensaje", () => {
  it("un error usa role alert y el texto sin reescribirlo", () => {
    render(<Mensaje tipo="error">Este archivo ya está publicado en otra sección. No se cargó.</Mensaje>);
    expect(screen.getByRole("alert")).toHaveTextContent("Este archivo ya está publicado en otra sección. No se cargó.");
  });
  it("un aviso y una confirmación usan role status", () => {
    render(
      <>
        <Mensaje tipo="aviso">uno</Mensaje>
        <Mensaje tipo="confirmacion">dos</Mensaje>
      </>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TablaRechazos", () => {
  it("sin rechazos no dibuja nada", () => {
    const { container } = render(<TablaRechazos rechazos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AvisosCarga", () => {
  it("sin avisos no dibuja nada", () => {
    const { container } = render(<AvisosCarga avisos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("lista cada aviso con el texto del campo mensaje", () => {
    render(
      <AvisosCarga
        avisos={[
          { pi: "5.3", motivo: "PUNTAJE_MAXIMO_DISTINTO", efecto: "AVISO", mensaje: "PI 5.3. Se cargó igual." },
          { pi: null, motivo: "COLUMNA_PI_FUERA_DEL_PLAN", efecto: "AVISO", mensaje: "Otra columna se ignoró." },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "PI 5.3. Se cargó igual.",
      "Otra columna se ignoró.",
    ]);
  });
});
