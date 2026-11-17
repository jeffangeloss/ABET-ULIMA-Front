import { vi } from "vitest";

export type Respuesta = { status: number; cuerpo?: unknown; tipo?: string; texto?: string };

export function json(status: number, cuerpo?: unknown): Respuesta {
  return { status, cuerpo };
}

export function respuestaDe(r: Respuesta): Response {
  const tipo = r.tipo ?? (r.texto === undefined ? "application/json" : "text/html");
  const cuerpo = r.status === 204 ? null : r.texto ?? (r.cuerpo === undefined ? "" : JSON.stringify(r.cuerpo));
  return new Response(cuerpo, { status: r.status, headers: { "content-type": tipo } });
}

type Ruta = Respuesta | ((init: RequestInit | undefined) => Respuesta | Promise<Respuesta>);

/** Sustituye fetch por un mapa «MÉTODO /ruta» a respuesta y deja el registro de llamadas. */
export function simularApi(rutas: Record<string, Ruta>) {
  const llamadas: { clave: string; init: RequestInit | undefined }[] = [];
  const falso = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const metodo = (init?.method ?? "GET").toUpperCase();
    const clave = `${metodo} ${String(entrada)}`;
    llamadas.push({ clave, init });
    const ruta = rutas[clave];
    if (!ruta) throw new Error(`Ruta no simulada ${clave}`);
    const r = typeof ruta === "function" ? await ruta(init) : ruta;
    return respuestaDe(r);
  });
  vi.stubGlobal("fetch", falso);
  return { falso, llamadas };
}
