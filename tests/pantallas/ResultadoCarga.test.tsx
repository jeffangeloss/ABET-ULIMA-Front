import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import contrato from "../../docs/03-api/contrato.md?raw";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import { QUE_CORREGIR, QUE_CORREGIR_FILA, queCorregir } from "../../src/servicios/ayudas";
import type { Constancia, Rol } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  constanciaConError,
  constanciaLimpia,
  constanciaOtraSeccion,
  constanciaReemplazada,
  constanciaSinColumna,
  constanciaSinFilasAceptadas,
  constanciaVigenteQueReemplaza,
  SHA,
} from "../respuestas";

function montar(constancia: Constancia, rol: Rol = "PROFESOR") {
  const alVolver = vi.fn();
  render(<ResultadoCarga cargaId={constancia.carga_id} rol={rol} constanciaInicial={constancia} alVolver={alVolver} />);
  return { alVolver };
}

// Ejemplos del esquema «Cada motivo de rechazo de toda la carga trae su forma de corregir» de que_corregir.feature.
const ejemplos = [
  ["PROFESOR", "PI_DEL_PLAN_AUSENTE", "5.2", "Revise en Blackboard que cada PI del plan de esta sección tenga su columna, y cree o renombre la del PI 5.2 como ABET SO5.2. Después exporte otra vez y suba el archivo nuevo."],
  ["PROFESOR", "PI_REPETIDO", "5.1", "Deje en Blackboard una sola columna del PI 5.1, exporte otra vez y suba el archivo nuevo."],
  ["PROFESOR", "COLUMNA_CODIGO_AUSENTE", null, "Exporte otra vez el Centro de calificaciones completo, que trae la columna Username, y suba ese archivo."],
  ["PROFESOR", "ARCHIVO_SIN_FILAS", null, "Exporte otra vez el Centro de calificaciones de la sección con sus estudiantes y suba ese archivo."],
  ["PROFESOR", "SIN_CALIFICACIONES", null, "Registre en Blackboard el nivel de cada estudiante en las columnas de los PI del plan, exporte otra vez y suba el archivo nuevo."],
  ["PROFESOR", "SECCION_NO_COINCIDE", null, "Exporte el Centro de calificaciones de 450002, sección 410, o suba este archivo en la sección que le corresponde."],
  ["COORDINADOR", "SECCION_NO_COINCIDE", null, "El archivo no es de 450002, sección 410. Pida al profesor de esa sección que exporte su Centro de calificaciones y lo suba otra vez."],
  ["PROFESOR", "PERIODO_NO_COINCIDE", null, "Exporte el Centro de calificaciones del curso de 2026-2 y suba ese archivo."],
] as const;

/** La carga 8 de la 410 de 450002 en 2026-2, RECHAZADA con filas_leidas 0 y un solo RECHAZA_CARGA. */
function rechazoDeCarga(motivo: string, pi: string | null): Constancia {
  const mensaje = `Mensaje de la API para ${motivo}.`;
  return {
    ...constanciaSinColumna,
    mensaje,
    rechazos: [{ ...constanciaSinColumna.rechazos[0], motivo, pi, mensaje }],
  };
}

/** Motivos de las reglas de la sección 6 del contrato que dejan la carga RECHAZADA con efecto RECHAZA_CARGA. */
function motivosDelContrato(): string[] {
  const cargas = contrato.split("## 6. Cargas")[1].split("## 7.")[0];
  // Las reglas de estructura, sección y periodo nombran sus motivos entre paréntesis.
  return cargas.split("\n")
    .filter((linea) => linea.startsWith("- **") && /RECHAZA_CARGA|queda RECHAZADA/.test(linea))
    .flatMap((linea) => Array.from(linea.matchAll(/\(([A-Z]+(?:_[A-Z]+)+)[,)]/g), (match) => match[1]));
}

describe("US-61 · Qué corregir", () => {
  it("la tabla de J-43 tiene un consejo para cada uno de los siete motivos RECHAZA_CARGA del contrato", () => {
    const motivos = motivosDelContrato();
    expect(new Set(motivos)).toEqual(new Set(ejemplos.map(([, motivo]) => motivo)));
    expect(new Set(motivos).size).toBe(7);
    for (const motivo of motivos) {
      expect(QUE_CORREGIR.has(motivo)).toBe(true);
      expect(queCorregir(rechazoDeCarga(motivo, "5.1"), "PROFESOR")).not.toBeNull();
    }
  });

  it.each(ejemplos)("%s con %s conserva el mensaje de la API, muestra debajo qué corregir y los conteos", (rol, motivo, pi, correccion) => {
    const carga = rechazoDeCarga(motivo, pi);
    montar(carga, rol);
    const mensaje = screen.getByRole("alert");
    expect(mensaje.textContent).toBe(carga.mensaje);
    expect(screen.getByText(`Qué corregir. ${correccion}`, { selector: "p" })).toAppearAfter(mensaje);
    expect(screen.getAllByText(/^Qué corregir/)).toHaveLength(1);
    expect(screen.getByText("0 filas leídas, 0 aceptadas y 0 rechazadas")).toBeInTheDocument();
  });

  it("el coordinador lee el mismo consejo que el profesor fuera de SECCION_NO_COINCIDE", () => {
    montar(rechazoDeCarga("PI_DEL_PLAN_AUSENTE", "5.2"), "COORDINADOR");
    expect(screen.getByText(`Qué corregir. ${ejemplos[0][3]}`)).toBeInTheDocument();
  });

  it("toma de la constancia el número completo del PI, incluido 6.10", () => {
    montar(rechazoDeCarga("PI_DEL_PLAN_AUSENTE", "6.10"));
    expect(screen.getByText(/la del PI 6\.10 como ABET SO6\.10\./)).toBeInTheDocument();
  });

  it.each(["MOTIVO_NUEVO", "PI_DEL_PLAN_AUSENTE", "PI_REPETIDO"])("%s con PI nulo conserva el mensaje de la API sin consejo", (motivo) => {
    const carga = rechazoDeCarga(motivo, null);
    montar(carga);
    expect(screen.getByRole("alert").textContent).toBe(carga.mensaje);
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
  });

  it("un motivo que el Front no conoce muestra solo el mensaje de la API, también con PI", () => {
    const carga = rechazoDeCarga("MOTIVO_NUEVO", "5.2");
    montar(carga);
    expect(screen.getByRole("alert").textContent).toBe(carga.mensaje);
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
  });
});

describe("US-62 · Esta carga no tiene R-17", () => {
  it.each(["RECHAZADA", "EN_CURSO", "REEMPLAZADA"] as const)("la carga 12 %s sin sucesora lo dice sin afirmar nada sobre la sección", (estado) => {
    montar({ ...constanciaSinColumna, carga_id: 12, estado, reemplaza_carga_id: null, reemplazada_por: null });
    expect(screen.getByText("Esta carga no tiene R-17.", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText(/No hay una carga publicada para esta sección/)).toBeNull();
    expect(screen.queryByText(/la reemplaza, así que/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });
});

describe("P4 Resultado de la carga", () => {
  it("con el rechazo de la fila 3 muestra estado, conteos, tabla de rechazos y descarga del R-17", () => {
    montar(constanciaConError);
    expect(screen.getByRole("heading", { level: 1, name: "Resultado de la carga" })).toHaveFocus();
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    const tabla = screen.getByRole("table", { name: "Filas rechazadas" });
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(2);
    const celdas = within(filas[1]).getAllByRole("cell").map((c) => c.textContent);
    expect(celdas).toEqual([
      "3",
      "5.2",
      "Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.",
    ]);
    expect(screen.getByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/7/r17.xlsx");
    // Cambio del 2026-11-23 (FR-012 de la spec 008, US-77). Una carga PUBLICADA con rechazos de fila dice qué corregir,
    // y la que no tiene rechazos ni avisos sigue sin consejo, como pedía «Una carga publicada no muestra «Qué corregir»».
    expect(screen.getByText(`Qué corregir. ${QUE_CORREGIR_FILA.get("NIVEL_FUERA_DE_ESCALA")}`)).toBeInTheDocument();
  });

  it("una carga publicada sin rechazos ni avisos no muestra «Qué corregir»", () => {
    montar(constanciaLimpia);
    expect(screen.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
  });

  it("el aviso de 5.3 va aparte de los rechazos, con el mensaje de la API", () => {
    montar(constanciaConError);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos).toHaveTextContent(
      "PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.",
    );
    expect(within(screen.getByRole("table")).queryByText(/columna declara 20 puntos/)).toBeNull();
    expect(within(avisos).queryByText(/nivel fuera de la escala/)).toBeNull();
  });

  it("sin rechazos ni avisos muestra 0 rechazadas y no dibuja la tabla ni los avisos", () => {
    montar(constanciaLimpia);
    expect(screen.getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("region", { name: "Avisos" })).toBeNull();
  });

  it("la constancia trae archivo sin ruta, hoja, huella, reglas PROVISIONAL, correo y horas de Lima", () => {
    montar(constanciaConError);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("export_inventado_410_con_error.xlsx");
    expect(constancia).toHaveTextContent("gc_SINTETICO_20262_450002_410_f");
    expect(constancia).toHaveTextContent(SHA);
    expect(constancia).toHaveTextContent("R-2026-BORRADOR (PROVISIONAL)");
    expect(constancia).toHaveTextContent("docente410@example.invalid");
    expect(constancia).toHaveTextContent("28/10/2026 10:15");
  });

  it("un export de texto trae la hoja nula y la constancia dice «Sin hoja (export de texto)»", () => {
    montar({ ...constanciaConError, nombre_archivo: "gc_SINTETICO_20262_450002_410_fullgc_2026-11-04-14-35-59.csv", hoja: null });
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("Sin hoja (export de texto)");
    expect(constancia).not.toHaveTextContent("null");
  });

  it("un .xlsx sigue mostrando el nombre de su hoja y no el texto de export sin hoja", () => {
    montar(constanciaConError);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(constancia).toHaveTextContent("gc_SINTETICO_20262_450002_410_f");
    expect(constancia).not.toHaveTextContent("Sin hoja");
  });

  it("una carga RECHAZADA por estructura muestra el motivo y no ofrece el R-17", () => {
    montar(constanciaSinColumna);
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(screen.getByText("0 filas leídas, 0 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.getAllByText("Falta la columna del PI 5.2 que el plan de medición pide para esta sección.").length)
      .toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(screen.getByText("Esta carga no tiene R-17.")).toBeInTheDocument();
    expect(screen.queryByText("No hay una carga publicada para esta sección")).toBeNull();
  });

  it("una carga de otra sección muestra el mensaje de la API y no se publica", () => {
    montar(constanciaOtraSeccion);
    expect(screen.getAllByText("El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.").length)
      .toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("sin filas aceptadas muestra el mensaje de la API junto con la tabla de rechazos", () => {
    montar(constanciaSinFilasAceptadas);
    expect(screen.getByText("Ninguna fila se pudo aceptar. La carga no se publicó.")).toBeInTheDocument();
    expect(screen.getByText("11 filas leídas, 0 aceptadas y 11 rechazadas")).toBeInTheDocument();
    // Cambio del 2026-11-23 (FR-012 y FR-019 de la spec 008). El texto deja de decir «Corrija en Blackboard».
    expect(screen.getByText("Qué corregir. Corrija el archivo en cada fila de la tabla de rechazos y suba el archivo nuevo. Si recibió el export de la Oficina de Calidad, pídale uno corregido."))
      .toAppearAfter(screen.getByRole("alert"));
    expect(screen.getByRole("table", { name: "Filas rechazadas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("un rechazo de toda la carga no inventa número de fila ni de PI", () => {
    montar(constanciaOtraSeccion);
    const tabla = screen.getByRole("table", { name: "Filas rechazadas" });
    const celdas = within(within(tabla).getAllByRole("row")[1]).getAllByRole("cell");
    expect(celdas[0]).toHaveTextContent("Archivo completo");
    expect(celdas[1]).toHaveTextContent("No aplica");
  });

  it("sin constancia inicial la pide a la API por el identificador", async () => {
    const { llamadas } = simularApi({ "GET /api/cargas/7": json(200, constanciaConError) });
    render(<ResultadoCarga cargaId={7} rol="PROFESOR" alVolver={vi.fn()} />);
    expect(await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/cargas/7"]);
  });

  it("si la API niega la carga muestra su detail y ningún dato", async () => {
    simularApi({ "GET /api/cargas/7": json(403, { detail: "La sección no está a su cargo." }) });
    render(<ResultadoCarga cargaId={7} rol="PROFESOR" alVolver={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("La sección no está a su cargo.");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("no muestra valores leídos ni nombres aunque la respuesta traiga campos de más", () => {
    const conExtras = {
      ...constanciaConError,
      rechazos: [{ ...constanciaConError.rechazos[0], valor: "5", valor_leido: "5", nombre: "Persona Inventada" }],
      estudiantes: [{ codigo: "99000002", nombre: "Persona Inventada" }],
    } as unknown as Constancia;
    montar(conExtras);
    expect(screen.queryByText(/Persona Inventada/)).toBeNull();
    expect(screen.queryByText(/99000002/)).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /valor/i })).toBeNull();
    const encabezados = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(encabezados).toEqual(["Fila", "PI", "Motivo y efecto"]);
  });

  it("Volver a mis secciones llama a alVolver", async () => {
    const { alVolver } = montar(constanciaConError);
    await userEvent.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    expect(alVolver).toHaveBeenCalled();
  });

  it("muestra el rótulo del piloto", () => {
    montar(constanciaConError);
    expect(screen.queryByText("Solo exports con códigos inventados (99000000 a 99999999)")).not.toBeInTheDocument();
  });
  it("sin reemplazo la constancia no trae las filas de reemplazo", () => {
    montar(constanciaConError);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(within(constancia).queryByText("Reemplaza a la carga")).toBeNull();
    expect(within(constancia).queryByText("Reemplazada por la carga")).toBeNull();
  });

  it("la carga vigente que reemplaza a otra lo dice en la constancia y ofrece el R-17", () => {
    montar(constanciaVigenteQueReemplaza);
    const constancia = screen.getByRole("region", { name: "Constancia" });
    const termino = within(constancia).getByText("Reemplaza a la carga");
    expect(termino.nextElementSibling).toHaveTextContent("10");
    expect(within(constancia).queryByText("Reemplazada por la carga")).toBeNull();
    expect(screen.getByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/11/r17.xlsx");
  });

  it("una carga REEMPLAZADA nombra a su sucesora como la publicada y no ofrece el R-17", () => {
    montar(constanciaReemplazada);
    expect(screen.getByText("Reemplazada")).toBeInTheDocument();
    expect(screen.getByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    const constancia = screen.getByRole("region", { name: "Constancia" });
    expect(within(constancia).getByText("Reemplazada por la carga").nextElementSibling).toHaveTextContent("11");
    expect(screen.getByText("La carga 11 la reemplaza, así que esta carga no tiene R-17.")).toBeInTheDocument();
    expect(screen.queryByText("Esta carga no tiene R-17.")).toBeNull();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it.each(["EN_CURSO", "REEMPLAZADA"] as const)("una carga %s con filas aceptadas y sin sucesora dice que esta carga no tiene R-17", (estado) => {
    montar({ ...constanciaReemplazada, estado, reemplazada_por: null });
    expect(screen.queryByText(/^Qué corregir/)).toBeNull();
    expect(screen.getByText("Esta carga no tiene R-17.")).toBeInTheDocument();
    expect(screen.queryByText("No hay una carga publicada para esta sección")).toBeNull();
    expect(screen.queryByText(/la reemplaza, así que/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });
});
