import { describe, expect, it } from "vitest";
import texto from "../vercel.json?raw";

// T072. El vercel.json del Front fija la región iad1, junto a Neon en us-east-1 (J-17), y reescribe
// /api hacia el Back del mismo entorno, para que el navegador vea un solo origen (ADR-004).
type Reescritura = {
  source: string;
  destination: string;
  has?: { type: string; value: string }[];
};

const configuracion = JSON.parse(texto) as { regions?: string[]; rewrites?: Reescritura[] };
const reescrituras = configuracion.rewrites ?? [];

const FRONT_PRODUCTION = "abet-ulima-front.vercel.app";
const BACK_PRODUCTION = "https://abet-ulima-back.vercel.app/api/:path*";
const BACK_DEVELOP = "https://abet-ulima-back-git-develop-jeffangeloss-projects.vercel.app/api/:path*";

describe("vercel.json del Front", () => {
  it("fija la región iad1, junto a Neon (J-17)", () => {
    expect(configuracion.regions).toEqual(["iad1"]);
  });

  it("manda /api del dominio de Production al Back de Production, antes que cualquier otra regla", () => {
    expect(reescrituras[0]).toEqual({
      source: "/api/:path*",
      has: [{ type: "host", value: FRONT_PRODUCTION }],
      destination: BACK_PRODUCTION,
    });
  });

  it("manda /api de cualquier otro dominio, como el de Preview, al Back de la rama develop", () => {
    expect(reescrituras[1]).toEqual({ source: "/api/:path*", destination: BACK_DEVELOP });
  });

  it("no deja que una regla sin el dominio de Production llegue al Back de Production", () => {
    const sinCondicion = reescrituras.filter((regla) => !regla.has);
    expect(sinCondicion.length).toBeGreaterThan(0);
    for (const regla of sinCondicion) {
      expect(regla.destination).not.toBe(BACK_PRODUCTION);
    }
  });

  it("no tiene más reglas, ni la de index.html, porque el Front no cambia de ruta", () => {
    expect(reescrituras).toHaveLength(2);
  });
});
