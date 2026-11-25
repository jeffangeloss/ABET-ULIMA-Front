import { describe, expect, it } from "vitest";
import { fraccion, porcentajeDeConteos, horaDeLima, meta, porcentaje, promedio, resumenFilas } from "../../src/servicios/formato";

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

describe("cifras de P6 (spec 004)", () => {
  it("el porcentaje lleva un decimal con coma y un espacio antes del signo", () => {
    expect(porcentaje(81.8)).toBe("81,8 %");
    expect(porcentaje(80)).toBe("80,0 %");
    expect(porcentaje(100)).toBe("100,0 %");
    expect(porcentaje(0)).toBe("0,0 %");
  });
  it("la meta va sin decimal cuando es entera y con coma cuando no", () => {
    expect(meta(80)).toBe("80 %");
    expect(meta(70)).toBe("70 %");
    expect(meta(75.5)).toBe("75,5 %");
  });
  it("la fracción dice cuántos logran de cuántos", () => {
    expect(fraccion(9, 11)).toBe("9 de 11");
    expect(fraccion(0, 10)).toBe("0 de 10");
  });
});

describe("cifras de P8 (spec 009)", () => {
  it("el promedio lleva dos decimales y coma", () => {
    expect(promedio(2.91)).toBe("2,91");
    expect(promedio(2.9)).toBe("2,90");
    expect(promedio(3)).toBe("3,00");
  });

  it("porcentajeDeConteos redondea la parte sobre el total a un decimal como ROUND(numeric, 1) de PostgreSQL", () => {
    expect(porcentajeDeConteos(79, 80)).toBe(98.8);
    expect(porcentajeDeConteos(1, 80)).toBe(1.3);
    expect(porcentajeDeConteos(2, 3)).toBe(66.7);
    expect(porcentajeDeConteos(1, 3)).toBe(33.3);
    expect(porcentajeDeConteos(10, 33)).toBe(30.3);
    expect(porcentajeDeConteos(0, 5)).toBe(0);
    expect(porcentajeDeConteos(5, 5)).toBe(100);
  });

  it("porcentajeDeConteos no inventa una cifra sin total ni con conteos inválidos", () => {
    expect(() => porcentajeDeConteos(1, 0)).toThrow();
    expect(() => porcentajeDeConteos(-1, 5)).toThrow();
    expect(() => porcentajeDeConteos(6, 5)).toThrow();
    expect(() => porcentajeDeConteos(1.5, 5)).toThrow();
  });
});
