import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import contrato from "../../docs/03-api/contrato.md?raw";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import { QUE_CORREGIR_FILA, queCorregir } from "../../src/servicios/ayudas";
import type { Constancia, Rechazo } from "../../src/servicios/tipos";
import { constanciaConError } from "../respuestas";

// Escenarios @delegado_a_vitest de US-77 en specs/008-ciclo-quimica-industrial/aceptacion/carga_quimica.feature del
// Back. Cada «it» lleva el título exacto del escenario, y el esquema suma el motivo entre paréntesis. La carga 31 de la
// sección inventada 701 de 5643 en 2026-1 tiene 34 filas leídas y el PI 6.1 del plan (D-48).

const SECCION_701 = { seccion_id: 21, asignatura: "5643", numero: "701", periodo: "2026-1" };
const FILAS = [5, 9, 14, 27];

const MENSAJE_DE_FILA: Record<string, (fila: number) => string> = {
  NIVEL_FUERA_DE_ESCALA: (fila) => `Fila ${fila}, PI 6.1, nivel fuera de la escala 1 a 4. La fila completa queda fuera.`,
  NIVEL_NO_NUMERICO: (fila) => `Fila ${fila}, PI 6.1, valor que no es un nivel de 1 a 4. La fila completa queda fuera.`,
  CODIGO_VACIO: (fila) => `Fila ${fila}, sin código de estudiante. La fila completa queda fuera.`,
  CODIGO_DUPLICADO: (fila) => `Fila ${fila}, el código de estudiante ya aparece en una fila anterior. La fila completa queda fuera.`,
  CODIGO_INVALIDO: (fila) => `Fila ${fila}, el código de estudiante no tiene 8 cifras. La fila completa queda fuera.`,
};

/** Rechazos de fila como los manda la ruta 6, con `pi` nulo en los motivos de código (contrato, sección 6). */
function rechazosDeFila(motivo: string, filas: readonly number[] = FILAS): Rechazo[] {
  const pi = motivo.startsWith("CODIGO_") ? null : "6.1";
  const mensaje = MENSAJE_DE_FILA[motivo] ?? ((fila: number) => `Fila ${fila}, motivo que el Front no conoce.`);
  return filas.map((fila) => ({ fila, pi, motivo, efecto: "RECHAZA_FILA", mensaje: mensaje(fila) }));
}

/** La carga 31 PUBLICADA de la 701, con 34 filas leídas y sin avisos, a la que cada escenario suma lo suyo. */
function carga31(cambios: Partial<Constancia> = {}): Constancia {
  return {
    ...constanciaConError,
    carga_id: 31,
    estado: "PUBLICADA",
    seccion: SECCION_701,
    nombre_archivo: "sintetico_20261_5643_701.xlsx",
    hoja: "gc_SINTETICO_20261_5643_701_f",
    subida_por: "docente701@example.invalid",
    filas_de_datos: 34,
    filas_leidas: 34,
    filas_aceptadas: 34,
    filas_rechazadas: 0,
    mensaje: null,
    columnas: [{ pi: "6.1", puntaje_maximo_declarado: 4 }],
    rechazos: [],
    avisos: [],
    ...cambios,
  };
}

function publicadaConRechazos(motivo: string): Constancia {
  return carga31({ filas_aceptadas: 30, filas_rechazadas: 4, rechazos: rechazosDeFila(motivo) });
}

function abrirP4(constancia: Constancia) {
  return render(
    <ResultadoCarga cargaId={constancia.carga_id} rol="PROFESOR" constanciaInicial={constancia} alVolver={vi.fn()} />,
  );
}

/** Celdas de la tabla de rechazos, sin la fila de encabezados. */
function celdasDeRechazos(): string[][] {
  const tabla = screen.getByRole("table", { name: "Filas rechazadas" });
  return within(tabla)
    .getAllByRole("row")
    .slice(1)
    .map((fila) => within(fila).getAllByRole("cell").map((c) => c.textContent ?? ""));
}

/**
 * Motivos RECHAZA_FILA de la sección 6 del contrato. La regla «Filas inválidas» nombra cada motivo tras «con», y el
 * párrafo de la constancia lista los rechazos por código entre paréntesis, donde está CODIGO_INVALIDO.
 */
function motivosDeFilaDelContrato(): string[] {
  const cargas = contrato.split("## 6. Cargas")[1].split("## 7.")[0];
  const reglaDeFilas = cargas.split("\n").find((linea) => linea.startsWith("- **Filas inválidas"));
  const porCodigo = /rechazo por código \(([^)]*)\)/.exec(cargas);
  if (!reglaDeFilas || !porCodigo) throw new Error("la sección 6 del contrato cambió de forma");
  const deLaRegla = Array.from(reglaDeFilas.matchAll(/\bcon ([A-Z]+(?:_[A-Z]+)+)/g), (m) => m[1]);
  const deCodigo = Array.from(porCodigo[1].matchAll(/[A-Z]+(?:_[A-Z]+)+/g), (m) => m[0]);
  return [...new Set([...deLaRegla, ...deCodigo])];
}

// Ejemplos del esquema «El consejo sigue al motivo de las filas rechazadas de una carga publicada».
const ejemplos = [
  {
    motivo: "NIVEL_FUERA_DE_ESCALA",
    consejo: "Algunas filas traen un valor fuera de 1 a 4. Si registró la nota sobre 20, conviértala al nivel de 1 a 4 de la rúbrica del curso.",
  },
  { motivo: "NIVEL_NO_NUMERICO", consejo: "Algunas filas traen un nivel que no es un entero, como 3,5. Escriba un nivel entero de 1 a 4." },
  { motivo: "CODIGO_VACIO", consejo: "Algunas filas no traen el código del estudiante. Complete la columna Username o Student ID." },
  { motivo: "CODIGO_DUPLICADO", consejo: "Un mismo código aparece en dos filas. Deje una sola fila por estudiante." },
  { motivo: "CODIGO_INVALIDO", consejo: "Algunos códigos no tienen 8 cifras. Revise la columna Username o Student ID." },
] as const;

const REMISION_A_P5 = "Para cambiar esta carga, use «Reemplazar carga» en Cargas.";

describe("US-77 · P4 dice qué corregir en filas rechazadas y avisos sin remitir a Blackboard", () => {
  it.each(ejemplos)("El consejo sigue al motivo de las filas rechazadas de una carga publicada ($motivo)", ({ motivo, consejo }) => {
    abrirP4(publicadaConRechazos(motivo));
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByText("34 filas leídas, 30 aceptadas y 4 rechazadas")).toBeInTheDocument();
    expect(screen.getByText(`Qué corregir. ${consejo}`, { selector: "p" })).toBeInTheDocument();
    expect(screen.getAllByText(/^Qué corregir/)).toHaveLength(1);
    // La tabla conserva su forma, con fila, PI y el mensaje de la API, sin valores de celda.
    const encabezados = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(encabezados).toEqual(["Fila", "PI", "Motivo y efecto"]);
    expect(celdasDeRechazos()).toEqual(
      rechazosDeFila(motivo).map((r) => [String(r.fila), r.pi ?? "No aplica", r.mensaje]),
    );
  });

  it("El aviso del puntaje máximo se muestra antes de la constancia", () => {
    const aviso = {
      pi: "6.1",
      motivo: "PUNTAJE_MAXIMO_DISTINTO",
      efecto: "AVISO" as const,
      mensaje: "PI 6.1. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.",
    };
    abrirP4(carga31({ columnas: [{ pi: "6.1", puntaje_maximo_declarado: 20 }], avisos: [aviso] }));
    const estado = screen.getByRole("status");
    expect(estado).toHaveTextContent(
      "La columna del PI 6.1 no declara un puntaje máximo de 4. Revise que cada celda sea el nivel de 1 a 4 y no la nota del instrumento.",
      { normalizeWhitespace: true },
    );
    expect(estado).toHaveAttribute("data-componente", "aviso");
    // Arriba, antes del estado de la carga, de los avisos de la API y de la constancia.
    expect(screen.getByText(/^Estado de la carga/)).toAppearAfter(estado);
    expect(screen.getByRole("region", { name: "Avisos" })).toAppearAfter(estado);
    expect(screen.getByRole("region", { name: "Constancia" })).toAppearAfter(estado);
    // El aviso de la API sigue en su lista, sin cambios.
    expect(screen.getByRole("region", { name: "Avisos" })).toHaveTextContent(aviso.mensaje);
  });

  it("Una carga rechazada sin filas aceptadas remite a la tabla sin nombrar Blackboard", () => {
    const valoresLeidos = ["20", "17", "0"];
    const rechazos = rechazosDeFila("NIVEL_FUERA_DE_ESCALA", [2, 3, 4]).map((r, i) => ({
      ...r,
      valor: valoresLeidos[i],
      valor_leido: valoresLeidos[i],
    }));
    abrirP4(
      carga31({
        carga_id: 8,
        estado: "RECHAZADA",
        filas_de_datos: 3,
        filas_leidas: 3,
        filas_aceptadas: 0,
        filas_rechazadas: 3,
        mensaje: "Ninguna fila se pudo aceptar. La carga no se publicó.",
        rechazos,
      } as Partial<Constancia>),
    );
    expect(
      screen.getByText(
        "Qué corregir. Corrija el archivo en cada fila de la tabla de rechazos y suba el archivo nuevo. Si recibió el export de la Oficina de Calidad, pídale uno corregido.",
        { selector: "p" },
      ),
    ).toAppearAfter(screen.getByRole("alert"));
    expect(document.body.textContent).not.toMatch(/Corrija en Blackboard/);
    const celdas = celdasDeRechazos();
    expect(celdas).toHaveLength(3);
    for (const [i, [fila, pi, motivo]] of celdas.entries()) {
      expect(fila).toBe(String(i + 2));
      expect(pi).toBe("6.1");
      expect(motivo).toBe(rechazos[i].mensaje);
    }
    for (const valor of valoresLeidos) expect(celdas.flat()).not.toContain(valor);
  });

  it("Una carga publicada sin rechazos ni avisos no muestra consejo", () => {
    abrirP4(carga31());
    expect(screen.getByText("34 filas leídas, 34 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
    expect(screen.queryByText(REMISION_A_P5)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("Un motivo de fila desconocido no muestra consejo y la prueba recorre los motivos del contrato", () => {
    const desconocido = carga31({ filas_aceptadas: 33, filas_rechazadas: 1, rechazos: rechazosDeFila("MOTIVO_NUEVO", [5]) });
    abrirP4(desconocido);
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
    expect(screen.queryByText(REMISION_A_P5)).toBeNull();
    expect(celdasDeRechazos()).toEqual([["5", "6.1", "Fila 5, motivo que el Front no conoce."]]);
    expect(queCorregir(desconocido, "PROFESOR")).toBeNull();
    // Un nombre de propiedad de Object no es un motivo con consejo.
    expect(queCorregir(carga31({ rechazos: rechazosDeFila("constructor", [5]) }), "PROFESOR")).toBeNull();

    // Cada motivo RECHAZA_FILA de la sección 6 del contrato tiene su consejo, y son los cinco del esquema.
    const motivos = motivosDeFilaDelContrato();
    expect(new Set(motivos)).toEqual(new Set(ejemplos.map((e) => e.motivo)));
    expect(new Set(QUE_CORREGIR_FILA.keys())).toEqual(new Set(motivos));
    for (const motivo of motivos) {
      expect(queCorregir(publicadaConRechazos(motivo), "PROFESOR")).toBe(ejemplos.find((e) => e.motivo === motivo)?.consejo);
    }
  });

  it("P4 de una carga publicada remite al reemplazo de P5", () => {
    abrirP4(publicadaConRechazos("NIVEL_FUERA_DE_ESCALA"));
    const consejo = screen.getByText(/^Qué corregir\. /, { selector: "p" });
    const remision = screen.getByText(REMISION_A_P5, { selector: "p" });
    expect(remision).toAppearAfter(consejo);
    expect(consejo.nextElementSibling).toBe(remision);
    expect(screen.queryByRole("button", { name: /Reemplazar/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Reemplazar/ })).toBeNull();
  });
});
