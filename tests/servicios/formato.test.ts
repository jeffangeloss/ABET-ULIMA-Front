import { describe, expect, it } from "vitest";
import { horaDeLima } from "../../src/servicios/formato";

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
