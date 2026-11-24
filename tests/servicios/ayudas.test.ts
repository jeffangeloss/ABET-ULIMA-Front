import { describe, expect, it } from "vitest";
import {
  consejosDeAvisos,
  CORREGIR_SIN_FILAS_ACEPTADAS,
  lineasAntesDeSubir,
  nombreDeColumna,
  QUE_CORREGIR_FILA,
  queCorregir,
  unirConY,
} from "../../src/servicios/ayudas";
import {
  constanciaConError,
  constanciaLimpia,
  constanciaReemplazada,
  constanciaSinColumna,
  constanciaSinFilasAceptadas,
} from "../respuestas";

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

  // Cambio del 2026-11-23 (FR-012 de la spec 008, US-77). Una carga PUBLICADA recibe el consejo de sus rechazos de
  // fila, y una sin rechazos, EN_CURSO o REEMPLAZADA sigue sin consejo.
  it("una carga RECHAZADA, o PUBLICADA con rechazos de fila, recibe consejo", () => {
    expect(queCorregir(constanciaConError, "PROFESOR")).toBe(QUE_CORREGIR_FILA.get("NIVEL_FUERA_DE_ESCALA"));
    expect(queCorregir(constanciaLimpia, "PROFESOR")).toBeNull();
    expect(queCorregir(constanciaReemplazada, "PROFESOR")).toBeNull();
    expect(queCorregir({ ...constanciaSinColumna, estado: "EN_CURSO" }, "PROFESOR")).toBeNull();
    expect(queCorregir(constanciaSinFilasAceptadas, "PROFESOR")).toBe(CORREGIR_SIN_FILAS_ACEPTADAS);
    // RECHAZADA sin ningún RECHAZA_CARGA ni filas leídas: no hay nada que la tabla sepa decir.
    expect(queCorregir({ ...constanciaSinColumna, rechazos: [] }, "PROFESOR")).toBeNull();
  });

  it("un motivo con el nombre de una propiedad de Object no encuentra consejo", () => {
    const carga = { ...constanciaSinColumna, rechazos: [{ ...constanciaSinColumna.rechazos[0], motivo: "constructor" }] };
    expect(queCorregir(carga, "PROFESOR")).toBeNull();
  });

  // Spec 008, US-77. El consejo del aviso del puntaje máximo nombra su PI y no se inventa sin él.
  it("el aviso PUNTAJE_MAXIMO_DISTINTO da su consejo con el PI y ninguno sin PI ni en una carga REEMPLAZADA", () => {
    expect(consejosDeAvisos(constanciaConError)).toEqual([
      "La columna del PI 5.3 no declara un puntaje máximo de 4. Revise que cada celda sea el nivel de 1 a 4 y no la nota del instrumento.",
    ]);
    const sinPi = { ...constanciaConError, avisos: [{ ...constanciaConError.avisos[0], pi: null }] };
    expect(consejosDeAvisos(sinPi)).toEqual([]);
    const otroAviso = { ...constanciaConError, avisos: [{ ...constanciaConError.avisos[0], motivo: "COLUMNA_PI_FUERA_DEL_PLAN" }] };
    expect(consejosDeAvisos(otroAviso)).toEqual([]);
    expect(consejosDeAvisos(constanciaReemplazada)).toEqual([]);
    expect(consejosDeAvisos(constanciaLimpia)).toEqual([]);
  });

  it("una carga PUBLICADA con varios motivos de fila une sus consejos sin repetir y omite el desconocido", () => {
    const fila = constanciaConError.rechazos[0];
    const carga = {
      ...constanciaConError,
      rechazos: [
        { ...fila, motivo: "CODIGO_VACIO", pi: null },
        { ...fila, motivo: "MOTIVO_NUEVO" },
        { ...fila, motivo: "NIVEL_FUERA_DE_ESCALA" },
        { ...fila, motivo: "CODIGO_VACIO", pi: null },
      ],
    };
    expect(queCorregir(carga, "PROFESOR")).toBe(
      `${QUE_CORREGIR_FILA.get("CODIGO_VACIO")} ${QUE_CORREGIR_FILA.get("NIVEL_FUERA_DE_ESCALA")}`,
    );
  });
});
