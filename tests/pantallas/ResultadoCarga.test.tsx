import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import type { Constancia } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  constanciaConError,
  constanciaLimpia,
  constanciaOtraSeccion,
  constanciaSinColumna,
  constanciaSinFilasAceptadas,
  SHA,
} from "../respuestas";

function montar(constancia: Constancia) {
  const alVolver = vi.fn();
  render(<ResultadoCarga cargaId={constancia.carga_id} constanciaInicial={constancia} alVolver={alVolver} />);
  return { alVolver };
}

describe("P4 Resultado de la carga", () => {
  it("con el rechazo de la fila 3 muestra estado, conteos, tabla de rechazos y descarga del R-17", () => {
    montar(constanciaConError);
    expect(screen.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toHaveFocus();
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    const tabla = screen.getByRole("table", { name: "Filas rechazadas" });
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(2);
    const celdas = within(filas[1]).getAllByRole("cell").map((c) => c.textContent);
    expect(celdas).toEqual([
      "3",
      "5.2",
      "Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.",
    ]);
    expect(screen.getByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/7/r17.xlsx");
  });

  it("el aviso de 5.3 va aparte de los rechazos, con el mensaje de la API", () => {
    montar(constanciaConError);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos).toHaveTextContent(
      "PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.",
    );
    expect(within(screen.getByRole("table")).queryByText(/columna declara 20 puntos/)).toBeNull();
    expect(within(avisos).queryByText(/nivel fuera de la escala/)).toBeNull();
  });

  it("sin rechazos ni avisos muestra 0 rechazadas y no dibuja la tabla ni los avisos", () => {
    montar(constanciaLimpia);
    expect(screen.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("region", { name: "Avisos" })).toBeNull();
  });

  it("la constancia trae archivo sin ruta, hoja, huella, reglas PROVISIONAL, correo y horas de Lima", () => {
    montar(constanciaConError);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("export_inventado_410_con_error.xlsx");
    expect(constancia).toHaveTextContent("gc_SINTETICO_20262_450002_410_f");
    expect(constancia).toHaveTextContent(SHA);
    expect(constancia).toHaveTextContent("R-2026-BORRADOR (PROVISIONAL)");
    expect(constancia).toHaveTextContent("docente410@example.invalid");
    expect(constancia).toHaveTextContent("28/10/2026 10:15");
  });

  it("un export de texto trae la hoja nula y la constancia dice «Sin hoja (export de texto)»", () => {
    montar({ ...constanciaConError, nombre_archivo: "gc_SINTETICO_20262_450002_410_fullgc_2026-11-04-14-35-59.csv", hoja: null });
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("Sin hoja (export de texto)");
    expect(constancia).not.toHaveTextContent("null");
  });

  it("un .xlsx sigue mostrando el nombre de su hoja y no el texto de export sin hoja", () => {
    montar(constanciaConError);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("gc_SINTETICO_20262_450002_410_f");
    expect(constancia).not.toHaveTextContent("Sin hoja");
  });

  it("una carga RECHAZADA por estructura muestra el motivo y no ofrece el R-17", () => {
    montar(constanciaSinColumna);
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(screen.getByText("0 filas leídas, 0 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.getAllByText("Falta la columna del PI 5.2 que el plan de medición pide para esta sección.").length)
      .toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(screen.getByText("No hay una carga publicada para esta sección")).toBeInTheDocument();
  });

  it("una carga de otra sección muestra el mensaje de la API y no se publica", () => {
    montar(constanciaOtraSeccion);
    expect(screen.getAllByText("El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.").length)
      .toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("sin filas aceptadas muestra el mensaje de la API junto con la tabla de rechazos", () => {
    montar(constanciaSinFilasAceptadas);
    expect(screen.getByText("Ninguna fila se pudo aceptar. La carga no se publicó.")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Filas rechazadas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("un rechazo de toda la carga no inventa número de fila ni de PI", () => {
    montar(constanciaOtraSeccion);
    const tabla = screen.getByRole("table", { name: "Filas rechazadas" });
    const celdas = within(within(tabla).getAllByRole("row")[1]).getAllByRole("cell");
    expect(celdas[0]).toHaveTextContent("Archivo completo");
    expect(celdas[1]).toHaveTextContent("No aplica");
  });

  it("sin constancia inicial la pide a la API por el identificador", async () => {
    const { llamadas } = simularApi({ "GET /api/cargas/7": json(200, constanciaConError) });
    render(<ResultadoCarga cargaId={7} alVolver={vi.fn()} />);
    expect(await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/cargas/7"]);
  });

  it("si la API niega la carga muestra su detail y ningún dato", async () => {
    simularApi({ "GET /api/cargas/7": json(403, { detail: "La sección no está a su cargo." }) });
    render(<ResultadoCarga cargaId={7} alVolver={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("La sección no está a su cargo.");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("no muestra valores leídos ni nombres aunque la respuesta traiga campos de más", () => {
    const conExtras = {
      ...constanciaConError,
      rechazos: [{ ...constanciaConError.rechazos[0], valor: "5", valor_leido: "5", nombre: "Persona Inventada" }],
      estudiantes: [{ codigo: "99000002", nombre: "Persona Inventada" }],
    } as unknown as Constancia;
    montar(conExtras);
    expect(screen.queryByText(/Persona Inventada/)).toBeNull();
    expect(screen.queryByText(/99000002/)).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /valor/i })).toBeNull();
    const encabezados = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(encabezados).toEqual(["Fila", "PI", "Motivo y efecto"]);
  });

  it("Volver a mis secciones llama a alVolver", async () => {
    const { alVolver } = montar(constanciaConError);
    await userEvent.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    expect(alVolver).toHaveBeenCalled();
  });

  it("muestra el rótulo del piloto", () => {
    montar(constanciaConError);
    expect(screen.getByText("Solo exports con códigos inventados (99000000 a 99999999)")).toBeInTheDocument();
  });
});
