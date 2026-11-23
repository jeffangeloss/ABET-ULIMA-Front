import { describe, expect, it } from "vitest";
import contrato from "../../docs/03-api/contrato.md?raw";
import {
  citasDeLaGuia,
  comprobarGuia,
  cotejar,
  piezasDeFuentes,
  portada,
  RUTA_DE_LA_GUIA,
  seccion,
} from "./cotejo_guia";

// Escenarios @delegado_a_vitest de US-87 en specs/008-ciclo-quimica-industrial/aceptacion/guia_y_privacidad.feature del
// Back (T049). Cada «it» lleva el título exacto del escenario. Los dos escenarios @playwright de US-87 viven en e2e/
// con el humo de T053, el de las tarjetas corre en el Back con --tarjetas (T034) y los de US-88 son del Back y de
// scripts/preflight.sh.

const fuentes = import.meta.glob<string>("../../src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });
const archivosDeLaGuia = import.meta.glob<string>("../../docs/capacitacion/guia_quimica.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const guia = Object.values(archivosDeLaGuia)[0] ?? "";
const piezas = piezasDeFuentes(fuentes);

/** Las líneas de la guía, que empiezan en 1, que citan el rótulo entre comillas latinas. */
function lineasQueCitan(rotulo: string): number[] {
  return citasDeLaGuia(guia)
    .filter((c) => c.rotulo === rotulo)
    .map((c) => c.linea);
}

describe("US-87, guía de la capacitación con rótulos verificados contra el Front", () => {
  it("Cada rótulo citado en la guía existe en el Front", () => {
    expect(guia, `falta ${RUTA_DE_LA_GUIA}`).not.toBe("");
    for (const rotulo of ["Subir export", "Antes de subir", "Descargar R-17", "Reemplazar carga", "Avance del registro del curso"]) {
      expect(lineasQueCitan(rotulo), `la guía no cita «${rotulo}»`).not.toEqual([]);
    }
    // Una cita partida en dos líneas escaparía al cotejo, así que cada línea abre y cierra sus comillas.
    guia.split("\n").forEach((linea, i) => {
      const abre = (linea.match(/«/g) ?? []).length;
      const cierra = (linea.match(/»/g) ?? []).length;
      expect(abre, `la línea ${i + 1} no cierra sus comillas latinas`).toBe(cierra);
    });
    expect(citasDeLaGuia(guia).length).toBeGreaterThanOrEqual(30);
    expect(cotejar(guia, piezas, contrato)).toEqual([]);
    expect(() => comprobarGuia(guia, piezas, contrato)).not.toThrow();
  });

  it("Un rótulo cambiado en el Front hace fallar la guía", () => {
    const cambiadas = Object.fromEntries(
      Object.entries(fuentes).map(([nombre, codigo]) => [nombre, codigo.replaceAll("Descargar R-17", "Bajar R-17")]),
    );
    expect(Object.values(cambiadas).join("\n")).not.toContain("Descargar R-17");
    const lineas = lineasQueCitan("Descargar R-17");
    expect(lineas).not.toEqual([]);
    const faltan = cotejar(guia, piezasDeFuentes(cambiadas), contrato);
    expect(faltan).toEqual(lineas.map((linea) => ({ rotulo: "Descargar R-17", linea })));
    let mensaje = "";
    try {
      comprobarGuia(guia, piezasDeFuentes(cambiadas), contrato);
    } catch (falla) {
      mensaje = (falla as Error).message;
    }
    for (const linea of lineas) expect(mensaje).toContain(`«Descargar R-17» en la línea ${linea} de ${RUTA_DE_LA_GUIA}`);
    // Con el Front de hoy, la misma guía no falla.
    expect(cotejar(guia, piezas, contrato).filter((c) => c.rotulo === "Descargar R-17")).toEqual([]);
  });

  it("La guía no trae datos que no debe", () => {
    expect(guia, `falta ${RUTA_DE_LA_GUIA}`).not.toBe("");
    const correos = guia.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    expect(correos.length).toBeGreaterThan(0);
    expect(correos.filter((c) => !c.toLowerCase().endsWith("@example.invalid"))).toEqual([]);
    expect(guia.match(/(?<!\d)\d{8}(?!\d)/g) ?? []).toEqual([]);
    // Ni una contraseña escrita junto a su nombre ni un texto con aspecto de clave, de 10 o más caracteres que mezclan
    // letras y cifras sin ser un nombre de archivo ni un correo.
    expect(guia.match(/(?:contraseña|clave|password)\b\s*(?:es\b|:|=)\s*\S+/gi) ?? []).toEqual([]);
    const parecenClaves = (guia.match(/\S{10,}/g) ?? []).filter(
      (t) => /[A-Za-z]/.test(t) && /\d/.test(t) && !/[@./«»`()]/.test(t),
    );
    expect(parecenClaves).toEqual([]);
  });

  it("Una fecha sin confirmar se dice como tal", () => {
    const tapa = portada(guia);
    expect(tapa).toContain("Fecha por confirmar");
    expect(tapa).toContain("Versión de prueba (develop)");
    // Mientras J-56 siga abierta, la portada no trae una fecha de la capacitación.
    const meses = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre";
    expect(tapa.match(new RegExp(`\\b\\d{1,2} de (?:${meses})\\b`, "gi")) ?? []).toEqual([]);
    expect(tapa.match(/\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b/g) ?? []).toEqual([]);
  });

  it("La guía del profesor sigue el flujo en el orden de las pantallas", () => {
    const delProfesor = seccion(guia, /profesor/i);
    expect(delProfesor).not.toBe("");
    const orden = ["Ingresar", "Mis secciones", "Subir export", "Antes de subir", "Resultado de la carga", "Descargar R-17", "Mis logros por SO"];
    const posiciones = orden.map((rotulo) => delProfesor.indexOf(`«${rotulo}»`));
    orden.forEach((rotulo, i) => expect(posiciones[i], `la sección del profesor no cita «${rotulo}»`).toBeGreaterThanOrEqual(0));
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
    // La sección del profesor no es la de la coordinación, que no sube archivos.
    expect(delProfesor).not.toContain("«Avance del registro del curso»");
  });

  it("La guía de la coordinación del curso no promete correos sin D-51", () => {
    const delCurso = seccion(guia, /coordinación del curso/i);
    expect(delCurso).not.toBe("");
    const citas = citasDeLaGuia(delCurso).map((c) => c.rotulo);
    expect(citas.some((r) => /^\d+ de \d+ secciones con carga publicada\.$/.test(r))).toBe(true);
    expect(citas).toContain("Ver la carga");
    expect(delCurso).not.toMatch(/copi/i);
    expect(delCurso).not.toMatch(/correos? (?:de|del) (?:los |las |cada |la )?(?:profesor|docente)/i);
    expect(delCurso).not.toMatch(/docente\d+@/);
  });
});

// Casos propios del cotejo, que no son escenarios. Comprueban que la herramienta no acepta lo que no debe.
describe("Cotejo de la guía, casos propios", () => {
  it("un rótulo que solo vive en un comentario no cuenta", () => {
    const solo = piezasDeFuentes({ "x.tsx": "// «Bajar R-17»\n/** Bajar R-17 */\nexport const a = 1;" });
    expect(cotejar("Use «Bajar R-17».", solo, "")).toEqual([{ rotulo: "Bajar R-17", linea: 1 }]);
    const conBoton = piezasDeFuentes({ "x.tsx": "export const B = () => <button>Bajar R-17</button>;" });
    expect(cotejar("Use «Bajar R-17».", conBoton, "")).toEqual([]);
  });

  it("una plantilla acepta sus valores y no acepta cualquier texto", () => {
    const plantilla = piezasDeFuentes({ "x.ts": "export const f = (a: number, b: number) => `${a} de ${b} secciones con carga publicada.`;" });
    expect(cotejar("«1 de 4 secciones con carga publicada.»", plantilla, "")).toEqual([]);
    const vacia = piezasDeFuentes({ "x.ts": "export const f = (a: string, b: string) => `${a} ${b}`;" });
    expect(cotejar("«Descargar R-17»", vacia, "")).toEqual([{ rotulo: "Descargar R-17", linea: 1 }]);
  });

  it("el contrato sostiene mensajes de la API y no botones", () => {
    const contratoDePrueba = "Responde «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.» y «Mis logros por SO».";
    expect(cotejar("«El archivo corresponde a la sección 799 y usted eligió la 701. No se publicó.»", [], contratoDePrueba)).toEqual([]);
    expect(cotejar("«Mis logros por SO»", [], contratoDePrueba)).toEqual([{ rotulo: "Mis logros por SO", linea: 1 }]);
  });
});
