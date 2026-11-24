// Aviso tssecurity:S8476 de SonarCloud (PR 39). Ningún valor que llega de la API o de la pantalla cambia la ruta ni el
// host del pedido: el periodo cumple AAAA-C y cada identificador es un entero positivo, o el pedido no sale.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  conConsulta,
  ErrorApi,
  listarCargas,
  listarPeriodos,
  listarSecciones,
  obtenerAvance,
  obtenerCarga,
  obtenerResultados,
  subirExport,
  urlR17,
} from "../../src/servicios/api";
import { json, simularApi } from "../ayudas";

const BASE = "https://front.example";
const MALICIOSOS = ["../x", "2026-1?x=1", "2026-1#a", "//otro.host", "%2F..%2Fx", "2026-1/../../x", "2026-13", ""];

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Simula fetch con 200 y una lista vacía y devuelve las URL que recibió. */
function fetchFalso() {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: RequestInfo | URL) => {
      urls.push(String(entrada));
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return urls;
}

/** El pedido no sale: rechaza con ErrorApi y fetch no ve ninguna URL. */
async function noSale(pedido: () => Promise<unknown>, urls: string[]) {
  await expect(pedido()).rejects.toBeInstanceOf(ErrorApi);
  for (const u of urls) {
    const url = new URL(u, BASE);
    expect(url.host).toBe("front.example");
  }
  expect(urls).toEqual([]);
}

describe("api.ts, rutas cerradas (S8476)", () => {
  // Sin periodo (texto vacío), cada función pide su ruta sin parámetros, como antes.
  it.each(MALICIOSOS.filter((v) => v !== ""))("un periodo %j no sale de listarSecciones, listarCargas, obtenerResultados ni obtenerAvance", async (valor) => {
    const urls = fetchFalso();
    await noSale(() => listarSecciones(valor), urls);
    await noSale(() => listarCargas(undefined, valor), urls);
    await noSale(() => obtenerResultados(valor), urls);
    await noSale(() => obtenerAvance(valor), urls);
  });

  it.each(MALICIOSOS)("un identificador %j no sale de obtenerCarga, subirExport ni listarCargas", async (valor) => {
    const urls = fetchFalso();
    const id = valor as unknown as number;
    const archivo = new File(["x"], "export.csv");
    await noSale(() => obtenerCarga(id), urls);
    await noSale(() => subirExport(id, archivo), urls);
    await noSale(() => subirExport(21, archivo, { reemplaza: id }), urls);
    await noSale(() => listarCargas(id), urls);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("un identificador numérico %d tampoco sale", async (id) => {
    const urls = fetchFalso();
    await noSale(() => obtenerCarga(id), urls);
    await noSale(() => listarCargas(id), urls);
  });

  it("un periodo AAAA-C y un entero positivo salen a la ruta de siempre, en el mismo origen", async () => {
    const urls = fetchFalso();
    await listarSecciones("2026-1");
    await listarCargas(undefined, "2026-0");
    await listarCargas(21);
    await obtenerResultados("2025-2");
    expect(urls).toEqual([
      "/api/secciones?periodo=2026-1",
      "/api/cargas?periodo=2026-0",
      "/api/cargas?seccion_id=21",
      "/api/resultados?periodo=2025-2",
    ]);
    for (const u of urls) expect(new URL(u, BASE).host).toBe("front.example");
  });

  it("listarPeriodos rechaza una respuesta con un periodo fuera de AAAA-C, para que la pantalla siga sin periodo", async () => {
    simularApi({ "GET /api/periodos": json(200, { vigente: "2026-2", periodos: ["2026-1", "../x"] }) });
    await expect(listarPeriodos()).rejects.toMatchObject({ detail: "La petición no tiene la forma esperada." });
    simularApi({ "GET /api/periodos": json(200, { vigente: "//otro.host", periodos: ["2026-1"] }) });
    await expect(listarPeriodos()).rejects.toBeInstanceOf(ErrorApi);
  });

  // urlR17 arma el enlace durante el render con el carga_id de la respuesta, la misma fuente que listarPeriodos cierra.
  it.each([...MALICIOSOS, "../../sesion", "1/../../avance?periodo=2026-1#", null, 0, -1, 1.5, Number.NaN])(
    "un carga_id %j no arma el enlace del R-17",
    (valor) => {
      expect(() => urlR17(valor as unknown as number)).toThrow(ErrorApi);
    },
  );

  it("un carga_id entero positivo arma el enlace del R-17 bajo /api/cargas/ del mismo origen", () => {
    const ruta = urlR17(7);
    expect(ruta).toBe("/api/cargas/7/r17.xlsx");
    const url = new URL(ruta, BASE);
    expect(url.host).toBe("front.example");
    expect(url.pathname).toBe("/api/cargas/7/r17.xlsx");
  });

  // Los validadores ya dejan pasar solo dígitos y un guion, así que esta prueba ejercita la codificación por sí sola:
  // falla si conConsulta deja de pasar los valores por URLSearchParams.
  it("conConsulta codifica &, =, #, ? y / del valor, y la ruta y el host no cambian", () => {
    const ruta = conConsulta("/api/cargas", { periodo: "1&x=2#a?b/../c" });
    expect(ruta).toBe("/api/cargas?periodo=1%26x%3D2%23a%3Fb%2F..%2Fc");
    const url = new URL(ruta, BASE);
    expect(url.host).toBe("front.example");
    expect(url.pathname).toBe("/api/cargas");
    expect([...url.searchParams.entries()]).toEqual([["periodo", "1&x=2#a?b/../c"]]);
    expect(url.hash).toBe("");
    expect(conConsulta("/api/cargas")).toBe("/api/cargas");
  });
});
