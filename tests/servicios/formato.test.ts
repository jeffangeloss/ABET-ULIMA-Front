import { describe, expect, it } from "vitest";
import { horaDeLima, resumenFilas } from "../../src/servicios/formato";

describe("horaDeLima", () => {
  it("conserva la hora cuando ya viene con el desfase de Lima", () => {
    expect(horaDeLima("2026-10-28T10:15:00-05:00")).toBe("28/10/2026 10:15");
  });
  it("convierte una hora en UTC a la de Lima", () => {
    expect(horaDeLima("2026-10-28T15:15:00Z")).toBe("28/10/2026 10:15");
  });
  it("cambia de día al convertir cerca de la medianoche", () => {
    expect(horaDeLima("2026-10-29T03:00:00Z")).toBe("28/10/2026 22:00");
  });
  it("devuelve el texto original si no es una fecha, sin fallar", () => {
    expect(horaDeLima("no es fecha")).toBe("no es fecha");
  });
});

describe("resumenFilas", () => {
  it("usa el plural con varias filas y el singular con una", () => {
    expect(resumenFilas({ filas_leidas: 11, filas_aceptadas: 10, filas_rechazadas: 1 })).toBe(
      "11 filas leídas, 10 aceptadas y 1 rechazada",
    );
    expect(resumenFilas({ filas_leidas: 1, filas_aceptadas: 1, filas_rechazadas: 0 })).toBe(
      "1 fila leída, 1 aceptada y 0 rechazadas",
    );
  });
  it("con cero filas no inventa ningún número", () => {
    expect(resumenFilas({ filas_leidas: 0, filas_aceptadas: 0, filas_rechazadas: 0 })).toBe(
      "0 filas leídas, 0 aceptadas y 0 rechazadas",
    );
  });
});
