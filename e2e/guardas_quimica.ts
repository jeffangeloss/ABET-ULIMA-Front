import { request, type APIRequestContext } from "@playwright/test";
import { cabecerasDeOmision } from "./comun";

// Guardas del humo de Química (spec 008, T053, US-85 y FR-023). Corren antes de que el humo ingrese por el navegador,
// con un contexto de peticiones propio, y nunca llaman a la ruta 5. La vista previa de develop recibe el humo una sola
// vez con la siembra inventada (J-56). Después Jefferson la restablece, siembra la capacitación y la congela hasta el
// 12-12-2026, así que el humo se niega a correr sobre ella y sobre una 701 que ya tiene su carga publicada.

export const CONGELADA = "develop tiene la siembra de la capacitación y está congelada hasta el 12-12-2026 (J-56).";
export const YA_USADA = "La 701 ya tiene una carga publicada. Restablezca la rama develop de Neon antes de otra corrida.";
export const SIN_SIEMBRA_INVENTADA =
  "coordinador.quimica@example.invalid no ingresa. La vista previa no tiene la siembra inventada o el archivo de contraseñas no es el de esta rama.";

const PERIODO = "2026-1";
const ASIGNATURA = "5643";
// La siembra inventada (db/datos/quimica_2026_1_inventado.sql del Back) da a la coordinación del curso estas cuatro
// secciones y ninguna otra. La de la capacitación trae las 18 secciones de la programación de 2026-1.
const SECCIONES_INVENTADAS = ["701", "702", "703", "704"];

interface Seccion {
  asignatura: { codigo: string };
  numero: string;
  estado?: string;
}

/** Sesión de la API para el correo, o null si la ruta 1 responde 401. Otra respuesta detiene el humo con su código. */
async function sesion(base: string, correo: string, contrasena: string): Promise<APIRequestContext | null> {
  const contexto = await request.newContext({ baseURL: base, extraHTTPHeaders: cabecerasDeOmision() });
  const r = await contexto.post("/api/sesion", { data: { correo, contrasena } });
  if (r.status() === 401) {
    await contexto.dispose();
    return null;
  }
  if (!r.ok()) {
    await contexto.dispose();
    throw new Error(`La ruta 1 respondió ${r.status()} a ${correo}. El humo no corre.`);
  }
  return contexto;
}

async function seccionesDe(contexto: APIRequestContext): Promise<Seccion[]> {
  const r = await contexto.get(`/api/secciones?periodo=${PERIODO}`);
  if (!r.ok()) throw new Error(`La ruta 4 de ${PERIODO} respondió ${r.status()}. El humo no corre.`);
  return (await r.json()) as Seccion[];
}

/**
 * Se detiene con CONGELADA si la coordinación del curso ve en 2026-1 algo distinto de las cuatro secciones inventadas
 * de 5643, que es la marca de la siembra de la capacitación, y con SIN_SIEMBRA_INVENTADA si no ingresa.
 */
export async function revisarSiembraInventada(base: string, contrasena: string): Promise<void> {
  const contexto = await sesion(base, "coordinador.quimica@example.invalid", contrasena);
  if (!contexto) throw new Error(SIN_SIEMBRA_INVENTADA);
  try {
    const lista = await seccionesDe(contexto);
    const numeros = lista.map((s) => s.numero).sort((a, b) => a.localeCompare(b));
    const inventada =
      lista.every((s) => s.asignatura.codigo === ASIGNATURA) && numeros.join(",") === SECCIONES_INVENTADAS.join(",");
    if (!inventada) throw new Error(CONGELADA);
  } finally {
    await contexto.dispose();
  }
}

/** Se detiene con YA_USADA, antes de cualquier subida, si la 701 de docente701 ya tiene una carga PUBLICADA. */
export async function revisarVistaPreviaNueva(base: string, contrasena: string): Promise<void> {
  const contexto = await sesion(base, "docente701@example.invalid", contrasena);
  if (!contexto) throw new Error("docente701@example.invalid no ingresa. El humo no corre.");
  try {
    const s701 = (await seccionesDe(contexto)).find((s) => s.asignatura.codigo === ASIGNATURA && s.numero === "701");
    if (!s701) throw new Error("docente701@example.invalid no tiene la 701 de 5643 en 2026-1. El humo no corre.");
    if (s701.estado === "PUBLICADA") throw new Error(YA_USADA);
  } finally {
    await contexto.dispose();
  }
}
