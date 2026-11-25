// Spec 009, T031. Las rutas 20 y 21 de src/servicios/api.ts siguen las validaciones cerradas del resto (S7044 y S8476 de
// SonarCloud). El periodo cumple AAAA-C y la asignatura son solo dígitos, o el pedido no sale de la página.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorApi, listarCursosDelResumen, obtenerResumenCurso } from "../../src/servicios/api";
import { json, simularApi } from "../ayudas";
import { cursosDeQuimica, resumen5643 } from "../respuestas";

const BASE = "https://front.example";
const PERIODOS_MALOS = ["../x", "2026-1?x=1", "2026-1#a", "//otro.host", "%2F..%2Fx", "2026-13", "2026", ""];
const ASIGNATURAS_MALAS = ["../x", "5643?x=1", "5643#a", "//otro.host", "5643/../../x", "Q43", "56 43", "", "1234567890123"];

afterEach(() => {
  vi.unstubAllGlobals();
});

function fetchFalso() {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entrada: RequestInfo | URL) => {
      urls.push(String(entrada));
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return urls;
}

describe("rutas 20 y 21 de api.ts", () => {
  it("un periodo y una asignatura en su patrón salen a la ruta de siempre, en el mismo origen", async () => {
    const urls = fetchFalso();
    await obtenerResumenCurso("2026-1", "5643");
    await obtenerResumenCurso("2026-2", "450002");
    await listarCursosDelResumen("2026-2");
    expect(urls).toEqual([
      "/api/resumen-curso?periodo=2026-1&asignatura=5643",
      "/api/resumen-curso?periodo=2026-2&asignatura=450002",
      "/api/resumen-curso/cursos?periodo=2026-2",
    ]);
    for (const u of urls) expect(new URL(u, BASE).host).toBe("front.example");
  });

  it.each(PERIODOS_MALOS)("un periodo %j no sale de la ruta 20 ni de la 21", async (periodo) => {
    const urls = fetchFalso();
    await expect(obtenerResumenCurso(periodo, "5643")).rejects.toMatchObject({ status: 422 });
    await expect(listarCursosDelResumen(periodo)).rejects.toBeInstanceOf(ErrorApi);
    expect(urls).toEqual([]);
  });

  it.each(ASIGNATURAS_MALAS)("una asignatura %j no sale de la ruta 20", async (asignatura) => {
    const urls = fetchFalso();
    await expect(obtenerResumenCurso("2026-1", asignatura)).rejects.toMatchObject({
      status: 422,
      detail: "La petición no tiene la forma esperada.",
    });
    expect(urls).toEqual([]);
  });

  it("una asignatura que no es texto no sale", async () => {
    const urls = fetchFalso();
    for (const valor of [null, undefined, 5643, {}]) {
      await expect(obtenerResumenCurso("2026-1", valor as unknown as string)).rejects.toBeInstanceOf(ErrorApi);
    }
    expect(urls).toEqual([]);
  });

  it("devuelven el cuerpo de la API sin cambiarlo y llevan el detail de un 403", async () => {
    simularApi({
      "GET /api/resumen-curso?periodo=2026-1&asignatura=5643": json(200, resumen5643),
      "GET /api/resumen-curso/cursos?periodo=2026-1": json(403, { detail: "Esta página es de la Coordinación." }),
    });
    expect(await obtenerResumenCurso("2026-1", "5643")).toEqual(resumen5643);
    await expect(listarCursosDelResumen("2026-1")).rejects.toMatchObject({ status: 403, detail: "Esta página es de la Coordinación." });
    simularApi({ "GET /api/resumen-curso/cursos?periodo=2026-1": json(200, cursosDeQuimica) });
    expect(await listarCursosDelResumen("2026-1")).toEqual(cursosDeQuimica);
  });
});
