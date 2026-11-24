// T040 de la spec 005. Una función por ruta, de la 13 a la 16 (contrato, sección 13), con el cuerpo cerrado que piden
// las rutas 15 y 16 y los campos de los 409 que P4 usa sin leer el texto.
import { describe, expect, it } from "vitest";
import { declarar, ErrorApi, guardarBorrador, obtenerIndicadores, obtenerMejora } from "../../src/servicios/api";
import { json, simularApi } from "../ayudas";
import { borradorDe, declaracionDe, indicadores412, mejoraVacia, textos412 } from "../respuestas_mejora";

const CUERPO = {
  version: 0,
  indicadores: [{ pi: "5.2", tipo: "OPORTUNIDAD_MEJORA" as const, causa: "La entrega coincidió con la semana de parciales.", accion: null }],
};

describe("api.ts, rutas 13 a 16 de la spec 005", () => {
  it("obtenerIndicadores pide GET /api/cargas/9/indicadores y devuelve el cuerpo tal cual", async () => {
    const { llamadas } = simularApi({ "GET /api/cargas/9/indicadores": json(200, indicadores412) });
    expect(await obtenerIndicadores(9)).toEqual(indicadores412);
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/cargas/9/indicadores"]);
    expect(llamadas[0].init?.credentials).toBe("same-origin");
  });

  it("obtenerIndicadores convierte el 404 de un Back anterior en ErrorApi con status 404", async () => {
    simularApi({ "GET /api/cargas/9/indicadores": json(404, { detail: "Not Found" }) });
    await expect(obtenerIndicadores(9)).rejects.toMatchObject({ status: 404 });
  });

  it("obtenerMejora pide GET /api/cargas/9/mejora y devuelve el cuerpo tal cual", async () => {
    const cuerpo = { ...mejoraVacia, borrador: borradorDe(indicadores412, textos412), declaracion: declaracionDe(indicadores412, textos412) };
    const { llamadas } = simularApi({ "GET /api/cargas/9/mejora": json(200, cuerpo) });
    expect(await obtenerMejora(9)).toEqual(cuerpo);
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/cargas/9/mejora"]);
  });

  it("guardarBorrador envía PUT con JSON de version e indicadores y nada más", async () => {
    const { llamadas } = simularApi({
      "PUT /api/cargas/9/mejora/borrador": json(200, { version: 1, actualizado_en: "2026-11-21T15:10:00-05:00" }),
    });
    expect(await guardarBorrador(9, CUERPO)).toEqual({ version: 1, actualizado_en: "2026-11-21T15:10:00-05:00" });
    const init = llamadas[0].init!;
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual(CUERPO);
    expect(init.keepalive).toBeFalsy();
  });

  it("guardarBorrador con keepalive lo pide al navegador para el guardado de pagehide", async () => {
    const { llamadas } = simularApi({ "PUT /api/cargas/9/mejora/borrador": json(200, { version: 1, actualizado_en: null }) });
    await guardarBorrador(9, CUERPO, { keepalive: true });
    expect(llamadas[0].init?.keepalive).toBe(true);
  });

  it("guardarBorrador no deja pasar claves fuera del contrato, como responsable, plazo o estado", async () => {
    const { llamadas } = simularApi({ "PUT /api/cargas/9/mejora/borrador": json(200, { version: 1, actualizado_en: null }) });
    const conClaves = {
      version: 0,
      responsable: "x",
      indicadores: [{ pi: "5.2", tipo: "OPORTUNIDAD_MEJORA" as const, causa: "a", accion: "b", plazo: "c", estado: "d" }],
    };
    await guardarBorrador(9, conClaves);
    const enviado = JSON.parse(String(llamadas[0].init!.body));
    expect(Object.keys(enviado).sort()).toEqual(["indicadores", "version"]);
    expect(Object.keys(enviado.indicadores[0]).sort()).toEqual(["accion", "causa", "pi", "tipo"]);
  });

  it("el 409 de dos pestañas trae el borrador guardado en el ErrorApi", async () => {
    const guardado = borradorDe(indicadores412, textos412, 3);
    simularApi({
      "PUT /api/cargas/9/mejora/borrador": json(409, { detail: "Otra pestaña guardó un texto más reciente.", borrador: guardado }),
    });
    const error = await guardarBorrador(9, CUERPO).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 409, detail: "Otra pestaña guardó un texto más reciente.", borrador: guardado, reemplazadaPor: null });
  });

  it("el 409 de una carga reemplazada trae reemplazada_por en el ErrorApi", async () => {
    simularApi({
      "PUT /api/cargas/9/mejora/borrador": json(409, {
        detail: "La carga no está publicada y no admite causas ni acciones.",
        reemplazada_por: 2,
      }),
    });
    await expect(guardarBorrador(9, CUERPO)).rejects.toMatchObject({ status: 409, reemplazadaPor: 2, borrador: null });
  });

  it("un 409 con campos mal formados no inventa borrador ni carga nueva", async () => {
    simularApi({ "PUT /api/cargas/9/mejora/borrador": json(409, { detail: "x", reemplazada_por: "2", borrador: { version: "3" } }) });
    await expect(guardarBorrador(9, CUERPO)).rejects.toMatchObject({ reemplazadaPor: null, borrador: null });
  });

  it("declarar envía POST con solo la version y devuelve la declaración del 201", async () => {
    const declaracion = declaracionDe(indicadores412, textos412);
    const { llamadas } = simularApi({ "POST /api/cargas/9/mejora/declaracion": json(201, declaracion) });
    expect(await declarar(9, 3)).toEqual(declaracion);
    expect(llamadas[0].init?.method).toBe("POST");
    expect(JSON.parse(String(llamadas[0].init!.body))).toEqual({ version: 3 });
  });

  it.each([0, -1, 1.5, Number.NaN])("con el carga_id %s ninguna de las cuatro rutas sale a la red", async (id) => {
    const { llamadas } = simularApi({});
    await expect(obtenerIndicadores(id)).rejects.toBeInstanceOf(ErrorApi);
    await expect(obtenerMejora(id)).rejects.toBeInstanceOf(ErrorApi);
    await expect(guardarBorrador(id, CUERPO)).rejects.toBeInstanceOf(ErrorApi);
    await expect(declarar(id, 1)).rejects.toBeInstanceOf(ErrorApi);
    expect(llamadas).toHaveLength(0);
  });
});
