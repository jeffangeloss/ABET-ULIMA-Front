import { describe, expect, it, vi } from "vitest";
import {
  alSesionVencida,
  cerrarSesion,
  ErrorApi,
  iniciarSesion,
  listarCargas,
  listarSecciones,
  obtenerCarga,
  sesionActual,
  subirExport,
  urlR17,
} from "../../src/servicios/api";
import { simularApi, json } from "../ayudas";
import { cargasDe410, constanciaConError, usuarioProfesor } from "../respuestas";

describe("api.ts", () => {
  it("llama solo a rutas /api y manda la cookie con credentials", async () => {
    const { llamadas } = simularApi({ "GET /api/sesion": json(200, usuarioProfesor) });
    await sesionActual();
    expect(llamadas[0].clave).toBe("GET /api/sesion");
    expect(llamadas[0].init?.credentials).toBe("same-origin");
  });

  it("iniciarSesion manda el correo y la contraseña en JSON por POST", async () => {
    const { llamadas } = simularApi({ "POST /api/sesion": json(200, usuarioProfesor) });
    const usuario = await iniciarSesion("docente410@example.invalid", "clave-de-prueba");
    expect(usuario).toEqual(usuarioProfesor);
    expect(JSON.parse(String(llamadas[0].init?.body))).toEqual({
      correo: "docente410@example.invalid",
      contrasena: "clave-de-prueba",
    });
  });

  it("convierte el error JSON en ErrorApi con el código y el detail sin reescribirlo", async () => {
    simularApi({ "GET /api/cargas/7": json(403, { detail: "La sección no está a su cargo." }) });
    await expect(obtenerCarga(7)).rejects.toMatchObject({
      status: 403,
      detail: "La sección no está a su cargo.",
    });
  });

  it("un detail que no es texto se reemplaza por el mensaje fijo de forma", async () => {
    simularApi({ "GET /api/secciones": json(422, { detail: [{ loc: ["query"], msg: "x" }] }) });
    await expect(listarSecciones()).rejects.toMatchObject({
      status: 422,
      detail: "La petición no tiene la forma esperada.",
    });
  });

  it("un 413 que no es JSON muestra el mensaje fijo y nunca el cuerpo crudo", async () => {
    simularApi({ "POST /api/secciones/1/cargas": { status: 413, texto: "<html>Request Entity Too Large</html>" } });
    const error = await subirExport(1, new File(["x"], "a.xlsx")).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.detail).toBe("El archivo supera el máximo de 1 MB.");
    expect(error.detail).not.toContain("html");
  });

  it("un 502 o 504 que no es JSON dice que el servicio no respondió", async () => {
    simularApi({ "GET /api/sesion": { status: 504, texto: "<html>Gateway Timeout</html>" } });
    await expect(sesionActual()).rejects.toMatchObject({
      status: 504,
      detail: "El servicio no respondió. Intente de nuevo.",
    });
  });

  it("la página HTML de protección de despliegues dice que el entorno no está disponible", async () => {
    simularApi({ "GET /api/secciones": { status: 401, texto: "<html>Vercel Authentication</html>" } });
    await expect(listarSecciones()).rejects.toMatchObject({
      detail: "El entorno de pruebas no está disponible.",
    });
  });

  it("si fetch falla por la red, el error trae código 0 y el mensaje fijo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(sesionActual()).rejects.toMatchObject({
      status: 0,
      detail: "El servicio no respondió. Intente de nuevo.",
    });
  });

  it("subirExport manda el campo archivo en multipart sin fijar Content-Type a mano", async () => {
    const { llamadas } = simularApi({ "POST /api/secciones/1/cargas": json(201, constanciaConError) });
    const resultado = await subirExport(1, new File(["x"], "export.xlsx"));
    const init = llamadas[0].init!;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("archivo")).toBeInstanceOf(File);
    expect(init.headers).toBeUndefined();
    expect(resultado).toEqual({ yaCargada: false, constancia: constanciaConError, aviso: null });
  });

  it("subirExport distingue el 200 del mismo archivo ya publicado", async () => {
    simularApi({ "POST /api/secciones/1/cargas": json(200, constanciaConError) });
    const resultado = await subirExport(1, new File(["x"], "export.xlsx"));
    expect(resultado.yaCargada).toBe(true);
  });

  it("listarSecciones sin periodo no manda parámetros", async () => {
    const { llamadas } = simularApi({ "GET /api/secciones": json(200, []) });
    await listarSecciones();
    expect(llamadas[0].clave).toBe("GET /api/secciones");
  });

  it("cerrarSesion acepta el 204", async () => {
    simularApi({ "DELETE /api/sesion": json(204) });
    await expect(cerrarSesion()).resolves.toBeUndefined();
  });

  it("urlR17 es la ruta relativa de descarga", () => {
    expect(urlR17(7)).toBe("/api/cargas/7/r17.xlsx");
  });

  it("un 401 de una ruta con sesión avisa a quien escucha el vencimiento", async () => {
    simularApi({ "GET /api/secciones": json(401, { detail: "La sesión venció. Ingrese otra vez." }) });
    const oyente = vi.fn();
    const quitar = alSesionVencida(oyente);
    await listarSecciones().catch(() => undefined);
    quitar();
    expect(oyente).toHaveBeenCalledWith("La sesión venció. Ingrese otra vez.");
  });

  it("el 401 del ingreso no cuenta como sesión vencida", async () => {
    simularApi({ "POST /api/sesion": json(401, { detail: "Correo o contraseña incorrectos." }) });
    const oyente = vi.fn();
    const quitar = alSesionVencida(oyente);
    await iniciarSesion("a@example.invalid", "x").catch(() => undefined);
    quitar();
    expect(oyente).not.toHaveBeenCalled();
  });
  it("subirExport sin opciones no manda reemplaza ni confirmar_seccion", async () => {
    const { llamadas } = simularApi({ "POST /api/secciones/1/cargas": json(201, constanciaConError) });
    await subirExport(1, new File(["x"], "export.xlsx"));
    expect(llamadas[0].clave).toBe("POST /api/secciones/1/cargas");
    expect((llamadas[0].init?.body as FormData).get("confirmar_seccion")).toBeNull();
  });

  it("subirExport con reemplaza agrega el parámetro a la ruta y no toca el cuerpo", async () => {
    const { llamadas } = simularApi({ "POST /api/secciones/1/cargas?reemplaza=7": json(201, constanciaConError) });
    await subirExport(1, new File(["x"], "export.xlsx"), { reemplaza: 7 });
    expect(llamadas[0].clave).toBe("POST /api/secciones/1/cargas?reemplaza=7");
    const cuerpo = llamadas[0].init?.body as FormData;
    expect([...cuerpo.keys()]).toEqual(["archivo"]);
  });

  it("subirExport con confirmarSeccion manda el campo confirmar_seccion con el texto true", async () => {
    const { llamadas } = simularApi({ "POST /api/secciones/1/cargas?reemplaza=7": json(201, constanciaConError) });
    await subirExport(1, new File(["x"], "notas.xlsx"), { reemplaza: 7, confirmarSeccion: true });
    const cuerpo = llamadas[0].init?.body as FormData;
    expect(cuerpo.get("confirmar_seccion")).toBe("true");
    expect((cuerpo.get("archivo") as File).name).toBe("notas.xlsx");
  });

  it("subirExport separa el aviso del 200 de la constancia", async () => {
    const aviso = "Es el mismo archivo de la carga publicada. No se reemplazó.";
    simularApi({ "POST /api/secciones/1/cargas?reemplaza=7": json(200, { ...constanciaConError, aviso }) });
    const resultado = await subirExport(1, new File(["x"], "export.xlsx"), { reemplaza: 7 });
    expect(resultado).toEqual({ yaCargada: true, constancia: constanciaConError, aviso });
    expect(resultado.constancia).not.toHaveProperty("aviso");
  });

  it("el 409 con carga_publicada lo lleva en ErrorApi sin pedir confirmación", async () => {
    const detail = "La sección 410 ya tiene una carga publicada. No se cargó el archivo.";
    simularApi({ "POST /api/secciones/1/cargas": json(409, { detail, carga_publicada: 7 }) });
    const error = await subirExport(1, new File(["x"], "a.xlsx")).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 409, detail, cargaPublicada: 7, requiereConfirmacion: false });
  });

  it("el 422 con requiere_confirmacion true lo lleva en ErrorApi", async () => {
    const detail = "El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?";
    simularApi({ "POST /api/secciones/1/cargas": json(422, { detail, requiere_confirmacion: true }) });
    const error = await subirExport(1, new File(["x"], "notas.xlsx")).catch((e) => e);
    expect(error).toMatchObject({ status: 422, detail, requiereConfirmacion: true, cargaPublicada: null });
  });

  it.each([
    ["el texto true", { requiere_confirmacion: "true", carga_publicada: "7" }],
    ["sin los campos", {}],
    ["con null", { requiere_confirmacion: null, carga_publicada: null }],
  ])("ErrorApi no pide confirmación ni nombra carga %s", async (_caso, extra) => {
    simularApi({ "POST /api/secciones/1/cargas": json(422, { detail: "x", ...extra }) });
    const error = await subirExport(1, new File(["x"], "a.xlsx")).catch((e) => e);
    expect(error).toMatchObject({ requiereConfirmacion: false, cargaPublicada: null });
  });

  it("un error que no es JSON trae requiereConfirmacion falso y cargaPublicada nula", async () => {
    simularApi({ "POST /api/secciones/1/cargas": { status: 413, texto: "<html>Too Large</html>" } });
    const error = await subirExport(1, new File(["x"], "a.xlsx")).catch((e) => e);
    expect(error).toMatchObject({ requiereConfirmacion: false, cargaPublicada: null });
  });

  it("listarCargas sin sección pide /api/cargas y devuelve la lista en el orden de la API", async () => {
    const { llamadas } = simularApi({ "GET /api/cargas": json(200, cargasDe410) });
    const lista = await listarCargas();
    expect(llamadas[0].clave).toBe("GET /api/cargas");
    expect(lista.map((c) => c.carga_id)).toEqual([11, 10, 9]);
  });

  it("listarCargas con sección filtra por seccion_id y propaga el 403", async () => {
    const { llamadas } = simularApi({
      "GET /api/cargas?seccion_id=1": json(200, cargasDe410),
      "GET /api/cargas?seccion_id=2": json(403, { detail: "La sección no está a su cargo." }),
    });
    await listarCargas(1);
    expect(llamadas[0].clave).toBe("GET /api/cargas?seccion_id=1");
    await expect(listarCargas(2)).rejects.toMatchObject({ status: 403, detail: "La sección no está a su cargo." });
  });
});
