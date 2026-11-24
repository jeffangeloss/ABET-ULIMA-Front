// Única puerta HTTP del Front (docs/01-arquitectura/frontend.md, sección 2). Ningún componente
// llama a fetch. La sesión viaja en la cookie abet_sesion, que el navegador manda solo porque el Front
// y la API comparten origen (ADR-004), así que este archivo no lee ni guarda ningún token.
import type { Avance, CargaResumida, Constancia, Periodos, ResultadoSubida, Resultados, Seccion, Usuario } from "./tipos";

const MSG_NO_RESPONDE = "El servicio no respondió. Intente de nuevo.";
const MSG_ENTORNO = "El entorno de pruebas no está disponible.";
const MSG_TAMANO = "El archivo supera el máximo de 1 MB.";
const MSG_FORMA = "La petición no tiene la forma esperada.";
const MSG_PERIODO = "El periodo no tiene la forma AAAA-C.";

/** AAAA-C con C de 0 a 2, el patrón cerrado de la API (contrato, secciones 15.2 y 15.5, y ck_periodo_ciclo). */
const PERIODO = /^\d{4}-[0-2]$/;

/** Toda ruta empieza en /api/ del mismo origen (ADR-004). Ninguna lleva host. */
type RutaApi = `/api/${string}`;

/**
 * Error de la API con el código HTTP y el texto que la pantalla muestra sin reescribirlo. Desde el corte 2
 * trae también los dos campos con que P3 ofrece el paso siguiente sin leer el texto (contrato, sección 3.1).
 */
export class ErrorApi extends Error {
  readonly status: number;
  readonly detail: string;
  /** Verdadero solo si el cuerpo trae requiere_confirmacion igual a true (422 de la sección sin declarar). */
  readonly requiereConfirmacion: boolean;
  /** El carga_id del 409 de una sección con carga publicada, o null. */
  readonly cargaPublicada: number | null;
  constructor(status: number, detail: string, requiereConfirmacion = false, cargaPublicada: number | null = null) {
    super(detail);
    this.name = "ErrorApi";
    this.status = status;
    this.detail = detail;
    this.requiereConfirmacion = requiereConfirmacion;
    this.cargaPublicada = cargaPublicada;
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

/**
 * Aviso S8476 de SonarCloud. Un periodo o un identificador fuera de su patrón cerrado no sale a la red, porque podría
 * cambiar la ruta o la consulta del pedido. El periodo mal formado lleva el mismo 422 que la API daría.
 */
function periodoCerrado(periodo: string): string {
  if (typeof periodo !== "string" || !PERIODO.test(periodo)) throw new ErrorApi(422, MSG_PERIODO);
  return periodo;
}

/** Un identificador de la API es un entero positivo. Cualquier otro valor no arma una ruta. */
function idCerrado(id: number): string {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorApi(422, MSG_FORMA);
  return String(id);
}

/** La ruta fija y su consulta codificada por URLSearchParams. Sin parámetros, la ruta va sola. */
function conConsulta(ruta: RutaApi, parametros: Record<string, string> = {}): RutaApi {
  const consulta = new URLSearchParams(parametros).toString();
  return consulta ? `${ruta}?${consulta}` : ruta;
}

async function aErrorApi(r: Response): Promise<ErrorApi> {
  const tipo = r.headers.get("content-type") ?? "";
  if (tipo.includes("json")) {
    try {
      const cuerpo = (await r.json()) as { detail?: unknown; requiere_confirmacion?: unknown; carga_publicada?: unknown } | null;
      const detail = cuerpo?.detail;
      const cargaPublicada = cuerpo?.carga_publicada;
      return new ErrorApi(
        r.status,
        typeof detail === "string" ? detail : MSG_FORMA,
        cuerpo?.requiere_confirmacion === true,
        typeof cargaPublicada === "number" ? cargaPublicada : null,
      );
    } catch {
      return new ErrorApi(r.status, MSG_NO_RESPONDE);
    }
  }
  // Una respuesta que no es JSON nunca se muestra cruda (Vercel y su protección de despliegues).
  if (r.status === 413) return new ErrorApi(r.status, MSG_TAMANO);
  if (tipo.includes("html") && (r.status === 401 || r.status === 403)) return new ErrorApi(r.status, MSG_ENTORNO);
  return new ErrorApi(r.status, MSG_NO_RESPONDE);
}

async function pedir(ruta: RutaApi, init: RequestInit = {}): Promise<Response> {
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
  const ruta = conConsulta("/api/secciones", periodo ? { periodo: periodoCerrado(periodo) } : {});
  return leer<Seccion[]>(await pedir(ruta));
}

export interface OpcionesSubida {
  /** Corte 2. La carga PUBLICADA que esta subida reemplaza (contrato, sección 7). */
  reemplaza?: number;
  /** Corte 2. Confirma la sección elegida cuando el archivo no la declara (US-21). */
  confirmarSeccion?: boolean;
}

export async function subirExport(
  seccionId: number,
  archivo: File,
  opciones: OpcionesSubida = {},
): Promise<ResultadoSubida> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", archivo);
  if (opciones.confirmarSeccion) cuerpo.append("confirmar_seccion", "true");
  const consulta: Record<string, string> = opciones.reemplaza === undefined ? {} : { reemplaza: idCerrado(opciones.reemplaza) };
  // Sin cabecera Content-Type, porque el navegador la arma con el límite del multipart.
  const r = await pedir(conConsulta(`/api/secciones/${idCerrado(seccionId)}/cargas`, consulta), { method: "POST", body: cuerpo });
  const { aviso, ...constancia } = await leer<Constancia & { aviso?: unknown }>(r);
  return {
    yaCargada: r.status === 200,
    constancia: constancia as Constancia,
    aviso: typeof aviso === "string" ? aviso : null,
  };
}

/**
 * Corte 2. Cargas al alcance del usuario, de la más reciente a la más antigua (contrato, sección 7). Desde la spec 008,
 * el periodo viaja solo sin seccion_id, porque la sección ya fija el suyo (contrato, sección 15.4).
 */
export async function listarCargas(seccionId?: number, periodo?: string): Promise<CargaResumida[]> {
  let parametros: Record<string, string> = {};
  if (seccionId !== undefined) parametros = { seccion_id: idCerrado(seccionId) };
  else if (periodo) parametros = { periodo: periodoCerrado(periodo) };
  return leer<CargaResumida[]>(await pedir(conConsulta("/api/cargas", parametros)));
}

/**
 * Spec 008. Periodo vigente y periodos con secciones al alcance del usuario (ruta 18, contrato, sección 15.2). Una
 * respuesta sin las dos claves es un error, para que App.tsx siga como hoy, sin periodo.
 */
export async function listarPeriodos(): Promise<Periodos> {
  const r = await pedir("/api/periodos");
  const cuerpo = await leer<Partial<Periodos> | null>(r);
  const vigente = cuerpo?.vigente;
  const periodos = cuerpo?.periodos;
  const enForma = (p: unknown): p is string => typeof p === "string" && PERIODO.test(p);
  if (!enForma(vigente) || !Array.isArray(periodos) || !periodos.every(enForma)) {
    throw new ErrorApi(r.status, MSG_FORMA);
  }
  return { vigente, periodos };
}

export async function obtenerCarga(cargaId: number): Promise<Constancia> {
  return leer<Constancia>(await pedir(`/api/cargas/${idCerrado(cargaId)}`));
}

/** Spec 004. Logros por SO de las secciones al alcance del usuario, sin identificadores (contrato, sección 12). */
export async function obtenerResultados(periodo?: string): Promise<Resultados> {
  const ruta = conConsulta("/api/resultados", periodo ? { periodo: periodoCerrado(periodo) } : {});
  return leer<Resultados>(await pedir(ruta));
}

/**
 * Spec 007, US-64, y spec 008, US-79. Etapa de cada sección al alcance de la coordinación (ruta 17, contrato, secciones
 * 14.2 y 15.5). Sin periodo, la API usa PERIODO_VIGENTE.
 */
export async function obtenerAvance(periodo?: string): Promise<Avance> {
  const ruta = conConsulta("/api/avance", periodo ? { periodo: periodoCerrado(periodo) } : {});
  return leer<Avance>(await pedir(ruta));
}

/** Enlace normal de descarga, para que el navegador use el nombre de archivo que fija la API. */
export function urlR17(cargaId: number): string {
  return `/api/cargas/${cargaId}/r17.xlsx`;
}
