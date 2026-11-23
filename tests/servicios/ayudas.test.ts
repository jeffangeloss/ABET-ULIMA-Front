import { describe, expect, it } from "vitest";
import { CORREGIR_SIN_FILAS_ACEPTADAS, lineasAntesDeSubir, nombreDeColumna, queCorregir, unirConY } from "../../src/servicios/ayudas";
import { constanciaConError, constanciaSinColumna, constanciaSinFilasAceptadas } from "../respuestas";

// Spec 007 del Back, J-43 y J-44: los textos de «Antes de subir» y «Qué corregir» viven en el Front.

describe("ayudas de la spec 007", () => {
  it("une los nombres de columna con comas y «y», y conserva el PI 6.10", () => {
    expect(unirConY([])).toBe("");
    expect(unirConY(["ABET SO5.1"])).toBe("ABET SO5.1");
    expect(unirConY(["ABET SO6.1", "ABET SO6.10"])).toBe("ABET SO6.1 y ABET SO6.10");
    expect(unirConY(["a", "b", "c"])).toBe("a, b y c");
    expect(nombreDeColumna("6.10")).toBe("ABET SO6.10");
  });

  it("sin PI no inventa la línea de las columnas y conserva las otras tres", () => {
    expect(lineasAntesDeSubir(["5.1"])).toHaveLength(4);
    const sinPi = lineasAntesDeSubir([]);
    expect(sinPi).toHaveLength(3);
    expect(sinPi.some((l) => l.startsWith("En Blackboard, una columna por PI"))).toBe(false);
  });

  it("solo una carga RECHAZADA recibe consejo", () => {
    expect(queCorregir(constanciaConError, "PROFESOR")).toBeNull();
    expect(queCorregir({ ...constanciaSinColumna, estado: "EN_CURSO" }, "PROFESOR")).toBeNull();
    expect(queCorregir(constanciaSinFilasAceptadas, "PROFESOR")).toBe(CORREGIR_SIN_FILAS_ACEPTADAS);
    // RECHAZADA sin ningún RECHAZA_CARGA ni filas leídas: no hay nada que la tabla sepa decir.
    expect(queCorregir({ ...constanciaSinColumna, rechazos: [] }, "PROFESOR")).toBeNull();
  });

  it("un motivo con el nombre de una propiedad de Object no encuentra consejo", () => {
    const carga = { ...constanciaSinColumna, rechazos: [{ ...constanciaSinColumna.rechazos[0], motivo: "constructor" }] };
    expect(queCorregir(carga, "PROFESOR")).toBeNull();
  });
});
