import type { Page, Route } from "@playwright/test";
import {
  avance5643,
  cargaRechazada701,
  constanciaPublicada701,
  indicador,
  seccion701,
  seccionConCarga,
  usuarioCoordinacionCurso,
  usuarioDocente701,
} from "../tests/respuestas";
import type { CargaResumida, Constancia, IndicadoresCarga, Mejora, Rechazo, Resultados, Seccion, Usuario } from "../src/servicios/tipos";

// API simulada de los escenarios @playwright de US-82 de la spec 008 (e2e/visual.spec.ts). El navegador nunca sale de
// la página: page.route responde cada /api con las respuestas del contrato y datos inventados de tests/respuestas.ts, la
// sección inventada 701 de 5643 en 2026-1, y una ruta que la prueba no simula responde 500 y queda anotada para que la
// prueba falle. Sin contraseñas, sin API local y sin base de datos.

/** La 701 PUBLICADA con la carga 31, 34 filas leídas y 22 aceptadas por los 12 rechazos de fila. */
export const seccion701Publicada: Seccion = {
  ...seccion701,
  estado: "PUBLICADA",
  carga_id: 31,
  filas_leidas: 34,
  filas_aceptadas: 22,
};

/** 12 rechazos RECHAZA_FILA inventados, filas 3 a 14 del export, con el mensaje que arma la API. */
export const docePorFila: Rechazo[] = Array.from({ length: 12 }, (_, i) => ({
  fila: i + 3,
  pi: "6.1",
  motivo: "NIVEL_FUERA_DE_ESCALA",
  efecto: "RECHAZA_FILA",
  mensaje: `Fila ${i + 3}, PI 6.1, nivel fuera de la escala 1 a 4. La fila completa queda fuera.`,
}));

/** La carga 31 de la 701 en P4, PUBLICADA con los 12 rechazos de fila. */
export const constancia31: Constancia = {
  ...constanciaPublicada701,
  filas_de_datos: 34,
  filas_leidas: 34,
  filas_aceptadas: 22,
  filas_rechazadas: 12,
  rechazos: docePorFila,
};

/** La 31 vigente en P5, más reciente que la 8 rechazada. */
const carga31: CargaResumida = {
  ...cargaRechazada701,
  carga_id: 31,
  estado: "PUBLICADA",
  nombre_archivo: "sintetico_20261_5643_701.xlsx",
  sha256_corto: "9e8d7c6b5a40",
  filas_leidas: 34,
  filas_aceptadas: 22,
  filas_rechazadas: 12,
  motivo: null,
  iniciada_en: "2026-11-20T10:15:00.000000-05:00",
  terminada_en: "2026-11-20T10:15:01.000000-05:00",
};

/** P6 de la 701 con el PI 6.1, 22 calificados y 17 en el nivel 3 o 4. */
export const resultados701: Resultados = {
  periodo: "2026-1",
  so: [{ numero: 6, descripcion: "Texto inventado del SO 6 de IND-2026." }],
  secciones: [seccionConCarga(21, "5643", "Química General", "701", 31, [indicador(6, "6.1", [2, 3, 10, 7], 77.3, false)])],
};

/**
 * Spec 005. La ruta 13 de la carga 31, con el 6.1 en ROJO y una oportunidad de mejora, para que P4 muestre «Cómo va su
 * sección» y «Análisis por indicador» a 375 px (contrato, sección 13.2).
 */
export const indicadores31: IndicadoresCarga = {
  carga_id: 31,
  estado: "PUBLICADA",
  provisional: true,
  conjunto_reglas: "R-IND-2026-BORRADOR",
  conjunto_reglas_estado: "BORRADOR",
  parametros_pendientes: ["CORTE_ROJO"],
  meta_pct: 80.0,
  corte_rojo_pct: null,
  indicadores: [
    {
      ...resultados701.secciones[0].indicadores[0],
      semaforo: "ROJO",
      hallazgo: "6.1: 77,3 % en Satisfactorio o más, meta 80,0 %",
      tipo_registro: "OPORTUNIDAD_MEJORA",
    },
  ],
};

/** Spec 005. La ruta 14 de la carga 31 sin texto, para su profesor. */
const mejora31: Mejora = { declaracion: null, borrador: null, borrador_pendiente: false, heredado_de: null, puede_editar: true };

export type Cuenta = "ninguna" | "docente701" | "coordinacion_curso";

const USUARIOS: Record<Exclude<Cuenta, "ninguna">, Usuario> = {
  docente701: usuarioDocente701,
  coordinacion_curso: usuarioCoordinacionCurso,
};

/** Dos periodos, para que la cabecera muestre el selector «Periodo» (contrato, sección 15.2). */
const PERIODOS = { vigente: "2026-1", periodos: ["2026-1", "2025-2"] };

/**
 * Instala la API simulada para la cuenta dada. Devuelve las rutas pedidas y las que no tenían respuesta, que la prueba
 * exige vacías al final.
 */
export async function simularApi(page: Page, cuenta: Cuenta) {
  const pedidas: string[] = [];
  const sinRespuesta: string[] = [];
  const responder = (ruta: Route, status: number, cuerpo: unknown) =>
    ruta.fulfill({ status, contentType: "application/json", body: JSON.stringify(cuerpo) });

  await page.route(/\/api\//, async (ruta) => {
    const peticion = ruta.request();
    const url = new URL(peticion.url());
    const clave = `${peticion.method()} ${url.pathname}`;
    pedidas.push(`${clave}${url.search}`);
    if (clave === "GET /api/sesion") {
      if (cuenta === "ninguna") return responder(ruta, 401, { detail: "Ingrese con su correo y contraseña." });
      return responder(ruta, 200, USUARIOS[cuenta]);
    }
    if (cuenta === "ninguna") {
      sinRespuesta.push(clave);
      return responder(ruta, 500, { detail: "Ruta no simulada." });
    }
    const respuestas: Record<string, unknown> = {
      "GET /api/periodos": PERIODOS,
      "GET /api/secciones": [seccion701Publicada],
      "GET /api/cargas": [carga31, cargaRechazada701],
      "GET /api/cargas/31": constancia31,
      "GET /api/cargas/31/indicadores": indicadores31,
      "GET /api/cargas/31/mejora": mejora31,
      "GET /api/resultados": resultados701,
      "GET /api/avance": avance5643,
    };
    if (clave in respuestas) return responder(ruta, 200, respuestas[clave]);
    sinRespuesta.push(clave);
    return responder(ruta, 500, { detail: "Ruta no simulada." });
  });
  return { pedidas, sinRespuesta };
}
