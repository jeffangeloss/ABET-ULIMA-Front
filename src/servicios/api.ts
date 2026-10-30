// Única puerta HTTP del Front (docs/01-arquitectura/frontend.md, sección 2). Ningún componente
// llama a fetch. La sesión viaja en la cookie abet_sesion, que el navegador manda solo porque el Front
// y la API comparten origen (ADR-004), así que este archivo no lee ni guarda ningún token.
import type { Constancia, ResultadoSubida, Seccion, Usuario } from "./tipos";

const MSG_NO_RESPONDE = "El servicio no respondió. Intente de nuevo.";
const MSG_ENTORNO = "El entorno de pruebas no está disponible.";
const MSG_TAMANO = "El archivo supera el máximo de 1 MB.";
const MSG_FORMA = "La petición no tiene la forma esperada.";

/** Error de la API con el código HTTP y el texto que la pantalla muestra sin reescribirlo. */
export class ErrorApi extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ErrorApi";
    this.status = status;
    this.detail = detail;
  }
}

type Oyente = (detail: string) => void;
const oyentes = new Set<Oyente>();

/** Registra quien se entera de un 401 en una ruta con sesión. Devuelve la función que lo quita. */
export function alSesionVencida(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

async function aErrorApi(r: Response): Promise<ErrorApi> {
  const tipo = r.headers.get("content-type") ?? "";
  if (tipo.includes("json")) {
    try {
      const cuerpo: unknown = await r.json();
      const detail = (cuerpo as { detail?: unknown } | null)?.detail;
      return new ErrorApi(r.status, typeof detail === "string" ? detail : MSG_FORMA);
    } catch {
      return new ErrorApi(r.status, MSG_NO_RESPONDE);
    }
  }
  // Una respuesta que no es JSON nunca se muestra cruda (Vercel y su protección de despliegues).
  if (r.status === 413) return new ErrorApi(r.status, MSG_TAMANO);
  if (tipo.includes("html") && (r.status === 401 || r.status === 403)) return new ErrorApi(r.status, MSG_ENTORNO);
  return new ErrorApi(r.status, MSG_NO_RESPONDE);
}

async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(ruta, { ...init, credentials: "same-origin" });
  } catch {
    throw new ErrorApi(0, MSG_NO_RESPONDE);
  }
  if (r.ok) return r;
  const error = await aErrorApi(r);
  // El 401 de /api/sesion lo resuelve la pantalla de ingreso o el arranque, no el aviso de vencimiento.
  if (error.status === 401 && !ruta.startsWith("/api/sesion")) oyentes.forEach((o) => o(error.detail));
  throw error;
}

async function leer<T>(r: Response): Promise<T> {
  try {
    return (await r.json()) as T;
  } catch {
    throw new ErrorApi(r.status, MSG_NO_RESPONDE);
  }
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<Usuario> {
  const r = await pedir("/api/sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasena }),
  });
  return leer<Usuario>(r);
}

export async function sesionActual(): Promise<Usuario> {
  return leer<Usuario>(await pedir("/api/sesion"));
}

export async function cerrarSesion(): Promise<void> {
  await pedir("/api/sesion", { method: "DELETE" });
}

export async function listarSecciones(periodo?: string): Promise<Seccion[]> {
  const ruta = periodo ? `/api/secciones?periodo=${encodeURIComponent(periodo)}` : "/api/secciones";
  return leer<Seccion[]>(await pedir(ruta));
}

export async function subirExport(seccionId: number, archivo: File): Promise<ResultadoSubida> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", archivo);
  // Sin cabecera Content-Type: el navegador la arma con el límite del multipart.
  const r = await pedir(`/api/secciones/${seccionId}/cargas`, { method: "POST", body: cuerpo });
  return { yaCargada: r.status === 200, constancia: await leer<Constancia>(r) };
}

export async function obtenerCarga(cargaId: number): Promise<Constancia> {
  return leer<Constancia>(await pedir(`/api/cargas/${cargaId}`));
}

/** Enlace normal de descarga, para que el navegador use el nombre de archivo que fija la API. */
export function urlR17(cargaId: number): string {
  return `/api/cargas/${cargaId}/r17.xlsx`;
}
