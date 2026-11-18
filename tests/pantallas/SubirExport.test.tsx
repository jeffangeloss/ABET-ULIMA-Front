import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubirExport } from "../../src/pantallas/SubirExport";
import { json, simularApi } from "../ayudas";
import {
  constanciaConError,
  constanciaLimpia,
  constanciaSinColumna,
  constanciaVigenteQueReemplaza,
  seccionPublicada,
  seccionSinCarga,
} from "../respuestas";

const RUTA = "POST /api/secciones/2/cargas";
const archivo = () =>
  new File(["contenido inventado"], "export_inventado_412.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

function montar(extra: { seccion?: typeof seccionSinCarga; reemplaza?: number } = {}) {
  const props = { seccion: seccionSinCarga, alResultado: vi.fn(), alVolver: vi.fn(), alVerResultado: vi.fn(), ...extra };
  render(<SubirExport {...props} />);
  return props;
}

async function subir(f: File = archivo()) {
  const u = userEvent.setup();
  await u.upload(screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"), f);
  await u.click(screen.getByRole("button", { name: "Subir" }));
}

// Corte 2. La 410 de 450002 (seccion_id 1), con la carga 7 publicada.
const RUTA_410 = "POST /api/secciones/1/cargas";
const RUTA_410_REEMPLAZA = "POST /api/secciones/1/cargas?reemplaza=7";
const DETAIL_409 = "La sección 410 ya tiene una carga publicada. No se cargó el archivo.";
const PREGUNTA_409 = "La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?";
const DETAIL_SIN_SECCION = "El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?";
const AVISO_MISMO = "Es el mismo archivo de la carga publicada. No se reemplazó.";
const exportCorrecto = () => new File(["contenido inventado"], "sintetico_20262_450002_410.xlsx");
const cuerpoDe = (init: RequestInit | undefined) => init?.body as FormData;

describe("P3 Subir export", () => {
  it("muestra la sección elegida fija, el campo de .xlsx, .csv y .xls, el botón Subir y el rótulo del piloto", () => {
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Subir export" })).toHaveFocus();
    expect(screen.getByText("450010 Gestión Ambiental, sección 412, 2026-2")).toBeInTheDocument();
    const campo = screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)");
    expect(campo).toHaveAttribute("type", "file");
    expect(campo).toHaveAttribute("accept", ".xlsx,.csv,.xls");
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled();
    expect(screen.getByText("Solo exports con códigos inventados (99000000 a 99999999)")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("un 201 pasa a P4 con la constancia, sea PUBLICADA o RECHAZADA", async () => {
    simularApi({ [RUTA]: json(201, constanciaSinColumna) });
    const p = montar();
    await subir();
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaSinColumna));
  });

  it("sube el archivo en el campo archivo de la sección elegida", async () => {
    const { llamadas } = simularApi({ [RUTA]: json(201, constanciaConError) });
    montar();
    await subir();
    await waitFor(() => expect(llamadas).toHaveLength(1));
    const cuerpo = llamadas[0].init?.body as FormData;
    expect((cuerpo.get("archivo") as File).name).toBe("export_inventado_412.xlsx");
  });

  it("un 200 dice que el archivo ya se cargó, con la hora de Lima, y enlaza a esa carga", async () => {
    simularApi({ [RUTA]: json(200, { ...constanciaConError, terminada_en: "2026-10-28T10:15:02-05:00" }) });
    const p = montar();
    await subir();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Este archivo ya se cargó el 28/10/2026 10:15 y está publicado en la sección 410. No se cargó de nuevo.",
    );
    expect(p.alResultado).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(p.alVerResultado).toHaveBeenCalledWith(7);
  });

  it.each([
    [403, "La sección no está a su cargo."],
    [409, "La sección 410 ya tiene una carga publicada. No se cargó el archivo."],
    [409, "Este archivo ya está publicado en otra sección. No se cargó."],
    [422, "El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada."],
    [422, "La sección confirmada no es la sección elegida. No se guardó nada."],
    [422, "El archivo está protegido con contraseña. Guárdelo sin contraseña y súbalo."],
    [500, "La carga no se completó y no se guardó ningún dato. Intente de nuevo."],
  ])("el %i se queda en P3 con el detail tal como llega: %s", async (status, detail) => {
    simularApi({ [RUTA]: json(status, { detail }) });
    const p = montar();
    await subir();
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    expect(p.alResultado).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled();
  });

  it("envía tal cual un archivo de otro tipo, sin aviso propio, y muestra el detail del 422", async () => {
    const detail = "Solo se admiten exports de Blackboard en formato .xlsx, .csv o .xls.";
    const { llamadas, falso } = simularApi({ [RUTA]: json(422, { detail }) });
    const p = montar();
    const u = userEvent.setup({ applyAccept: false });
    const pdf = new File(["contenido inventado"], "export_410.pdf", { type: "application/pdf" });
    await u.upload(screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"), pdf);
    expect(screen.queryByRole("alert")).toBeNull();
    await u.click(screen.getByRole("button", { name: "Subir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    expect(falso).toHaveBeenCalledTimes(1);
    expect(((llamadas[0].init?.body as FormData).get("archivo") as File).name).toBe("export_410.pdf");
    expect(p.alResultado).not.toHaveBeenCalled();
  });

  it("un 413 de Vercel muestra el máximo de 1 MB", async () => {
    simularApi({ [RUTA]: { status: 413, texto: "<html>Too Large</html>" } });
    montar();
    await subir();
    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo supera el máximo de 1 MB.");
  });

  it("sin archivo no sale ninguna petición y pide elegirlo", async () => {
    const { falso } = simularApi({});
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Subir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Elija el archivo del export (.xlsx, .csv o .xls).");
    expect(falso).not.toHaveBeenCalled();
  });

  it("mientras la API responde el botón queda desactivado y sale una sola subida", async () => {
    let soltar: () => void = () => undefined;
    const espera = new Promise<void>((r) => (soltar = r));
    const { falso } = simularApi({
      [RUTA]: async () => {
        await espera;
        return json(201, constanciaConError);
      },
    });
    montar();
    await subir();
    expect(screen.getByRole("button", { name: "Subiendo" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Subiendo" }));
    expect(falso).toHaveBeenCalledTimes(1);
    soltar();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Subiendo" })).toBeNull());
  });

  it("el control de archivo es propio y en español, con el nombre del archivo elegido", async () => {
    montar();
    const campo = screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)");
    expect(campo).toHaveClass("sr-only");
    expect(screen.getByText("Ningún archivo elegido")).toBeInTheDocument();
    const abrir = vi.spyOn(campo as HTMLInputElement, "click");
    await userEvent.click(screen.getByText("Elegir archivo"));
    expect(abrir).toHaveBeenCalledTimes(1);
    await userEvent.upload(campo, archivo());
    expect(screen.getByText("export_inventado_412.xlsx")).toBeInTheDocument();
    expect(screen.queryByText("Ningún archivo elegido")).toBeNull();
  });

  it("el botón propio no suma otra parada de tabulación y el campo de archivo sigue con su etiqueta", () => {
    montar();
    const elegir = screen.getByText("Elegir archivo");
    expect(elegir).toHaveAttribute("tabindex", "-1");
    expect(elegir).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)")).toHaveLength(1);
  });

  it("no muestra vista previa, ruta local ni códigos de estudiantes, y vuelve a P2", async () => {
    const p = montar();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/99000002|C:\\|\/Users\//)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    expect(p.alVolver).toHaveBeenCalled();
  });
  it("un 409 de la sección con carga publicada pregunta si se reemplaza y reenvía el archivo con reemplaza", async () => {
    const { llamadas } = simularApi({
      [RUTA_410]: json(409, { detail: DETAIL_409, carga_publicada: 7 }),
      [RUTA_410_REEMPLAZA]: json(201, constanciaVigenteQueReemplaza),
    });
    const p = montar({ seccion: seccionPublicada });
    await subir(exportCorrecto());
    expect(await screen.findByRole("status")).toHaveTextContent(PREGUNTA_409);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(p.alResultado).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sí, reemplazarla" }));
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaVigenteQueReemplaza));
    expect(llamadas.map((l) => l.clave)).toEqual([RUTA_410, RUTA_410_REEMPLAZA]);
    const primero = cuerpoDe(llamadas[0].init).get("archivo") as File;
    const segundo = cuerpoDe(llamadas[1].init).get("archivo") as File;
    expect(segundo).toBe(primero);
    expect(cuerpoDe(llamadas[1].init).get("confirmar_seccion")).toBeNull();
  });

  it("con «No» la pregunta del 409 se cierra sin otra petición", async () => {
    const { falso } = simularApi({ [RUTA_410]: json(409, { detail: DETAIL_409, carga_publicada: 7 }) });
    const p = montar({ seccion: seccionPublicada });
    await subir(exportCorrecto());
    await screen.findByText(PREGUNTA_409);
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText(PREGUNTA_409)).toBeNull();
    expect(screen.queryByRole("button", { name: "Sí, reemplazarla" })).toBeNull();
    expect(falso).toHaveBeenCalledTimes(1);
    expect(p.alResultado).not.toHaveBeenCalled();
  });

  it("un 409 sin carga_publicada no pregunta y muestra su detail como error", async () => {
    simularApi({ [RUTA_410]: json(409, { detail: DETAIL_409 }) });
    montar({ seccion: seccionPublicada });
    await subir(exportCorrecto());
    expect(await screen.findByRole("alert")).toHaveTextContent(DETAIL_409);
    expect(screen.queryByRole("button", { name: "Sí, reemplazarla" })).toBeNull();
  });

  it("en modo reemplazo dice qué carga reemplaza y envía reemplaza desde la primera subida", async () => {
    const { llamadas } = simularApi({ [RUTA_410_REEMPLAZA]: json(201, constanciaVigenteQueReemplaza) });
    const p = montar({ seccion: seccionPublicada, reemplaza: 7 });
    expect(screen.getByText("Reemplaza a la carga 7, la publicada de esta sección.")).toBeInTheDocument();
    await subir(exportCorrecto());
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaVigenteQueReemplaza));
    expect(llamadas.map((l) => l.clave)).toEqual([RUTA_410_REEMPLAZA]);
  });

  it("fuera del modo reemplazo no nombra ninguna carga a reemplazar ni manda reemplaza", async () => {
    const { llamadas } = simularApi({ [RUTA]: json(201, constanciaConError) });
    montar();
    expect(screen.queryByText(/Reemplaza a la carga/)).toBeNull();
    await subir();
    await waitFor(() => expect(llamadas).toHaveLength(1));
    expect(llamadas[0].clave).toBe(RUTA);
  });

  it("en el reemplazo, el 422 del archivo que no abre muestra que la carga publicada no cambió", async () => {
    const detail = "No se pudo abrir el archivo. La carga publicada no cambió.";
    const { falso } = simularApi({ [RUTA_410_REEMPLAZA]: json(422, { detail }) });
    const p = montar({ seccion: seccionPublicada, reemplaza: 7 });
    await subir(new File(["no es un zip"], "sintetico_20262_450002_410.xlsx"));
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    expect(screen.queryByRole("button", { name: /^Sí/ })).toBeNull();
    expect(falso).toHaveBeenCalledTimes(1);
    expect(p.alResultado).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled();
  });

  it("en el reemplazo, un 409 no vuelve a preguntar y muestra su detail", async () => {
    const detail = "La carga que pide reemplazar no es la publicada de la sección 410. No se cargó el archivo.";
    simularApi({ [RUTA_410_REEMPLAZA]: json(409, { detail, carga_publicada: 8 }) });
    montar({ seccion: seccionPublicada, reemplaza: 7 });
    await subir(exportCorrecto());
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    expect(screen.queryByRole("button", { name: "Sí, reemplazarla" })).toBeNull();
  });

  it("un 200 en el reemplazo muestra el aviso del mismo archivo y enlaza a la carga publicada", async () => {
    simularApi({ [RUTA_410_REEMPLAZA]: json(200, { ...constanciaConError, aviso: AVISO_MISMO }) });
    const p = montar({ seccion: seccionPublicada, reemplaza: 7 });
    await subir(exportCorrecto());
    expect(await screen.findByRole("status")).toHaveTextContent(AVISO_MISMO);
    expect(screen.queryByText(/No se cargó de nuevo/)).toBeNull();
    expect(p.alResultado).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(p.alVerResultado).toHaveBeenCalledWith(7);
  });

  it("un 422 que pide confirmar la sección muestra la pregunta y, con «Sí», reenvía con confirmar_seccion", async () => {
    const { llamadas } = simularApi({
      [RUTA_410]: (init) =>
        cuerpoDe(init).get("confirmar_seccion") === "true"
          ? json(201, constanciaLimpia)
          : json(422, { detail: DETAIL_SIN_SECCION, requiere_confirmacion: true }),
    });
    const p = montar({ seccion: seccionPublicada });
    await subir(new File(["contenido inventado"], "notas.xlsx"));
    expect(await screen.findByRole("status")).toHaveTextContent(DETAIL_SIN_SECCION);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(cuerpoDe(llamadas[0].init).get("confirmar_seccion")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Sí, es de esta sección" }));
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaLimpia));
    expect(llamadas.map((l) => l.clave)).toEqual([RUTA_410, RUTA_410]);
    expect(cuerpoDe(llamadas[1].init).get("confirmar_seccion")).toBe("true");
    expect((cuerpoDe(llamadas[1].init).get("archivo") as File).name).toBe("notas.xlsx");
  });

  it("con «No» la confirmación de la sección se cierra sin otra petición", async () => {
    const { falso } = simularApi({ [RUTA_410]: json(422, { detail: DETAIL_SIN_SECCION, requiere_confirmacion: true }) });
    const p = montar({ seccion: seccionPublicada });
    await subir(new File(["contenido inventado"], "notas.xlsx"));
    await screen.findByText(DETAIL_SIN_SECCION);
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText(DETAIL_SIN_SECCION)).toBeNull();
    expect(falso).toHaveBeenCalledTimes(1);
    expect(p.alResultado).not.toHaveBeenCalled();
  });

  it("la confirmación de la sección conserva el reemplaza del modo reemplazo", async () => {
    const { llamadas } = simularApi({
      [RUTA_410_REEMPLAZA]: (init) =>
        cuerpoDe(init).get("confirmar_seccion") === "true"
          ? json(201, constanciaVigenteQueReemplaza)
          : json(422, { detail: DETAIL_SIN_SECCION, requiere_confirmacion: true }),
    });
    const p = montar({ seccion: seccionPublicada, reemplaza: 7 });
    await subir(new File(["contenido inventado"], "notas.xlsx"));
    await userEvent.click(await screen.findByRole("button", { name: "Sí, es de esta sección" }));
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaVigenteQueReemplaza));
    expect(llamadas.map((l) => l.clave)).toEqual([RUTA_410_REEMPLAZA, RUTA_410_REEMPLAZA]);
  });

  it("tras aceptar el reemplazo, la confirmación de la sección se reenvía con reemplaza y confirmar_seccion", async () => {
    const { llamadas } = simularApi({
      [RUTA_410]: json(409, { detail: DETAIL_409, carga_publicada: 7 }),
      [RUTA_410_REEMPLAZA]: (init) =>
        cuerpoDe(init).get("confirmar_seccion") === "true"
          ? json(201, constanciaVigenteQueReemplaza)
          : json(422, { detail: DETAIL_SIN_SECCION, requiere_confirmacion: true }),
    });
    const p = montar({ seccion: seccionPublicada });
    await subir(new File(["contenido inventado"], "notas.xlsx"));
    await userEvent.click(await screen.findByRole("button", { name: "Sí, reemplazarla" }));
    await userEvent.click(await screen.findByRole("button", { name: "Sí, es de esta sección" }));
    await waitFor(() => expect(p.alResultado).toHaveBeenCalledWith(constanciaVigenteQueReemplaza));
    expect(llamadas.map((l) => l.clave)).toEqual([RUTA_410, RUTA_410_REEMPLAZA, RUTA_410_REEMPLAZA]);
  });

  it("un 422 sin requiere_confirmacion verdadero no ofrece confirmar y muestra su detail como error", async () => {
    simularApi({ [RUTA_410]: json(422, { detail: DETAIL_SIN_SECCION, requiere_confirmacion: "true" }) });
    montar({ seccion: seccionPublicada });
    await subir(new File(["contenido inventado"], "notas.xlsx"));
    expect(await screen.findByRole("alert")).toHaveTextContent(DETAIL_SIN_SECCION);
    expect(screen.queryByRole("button", { name: "Sí, es de esta sección" })).toBeNull();
  });

  it("cambiar el archivo cierra la pregunta pendiente", async () => {
    simularApi({ [RUTA_410]: json(409, { detail: DETAIL_409, carga_publicada: 7 }) });
    montar({ seccion: seccionPublicada });
    await subir(exportCorrecto());
    await screen.findByText(PREGUNTA_409);
    await userEvent.upload(
      screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"),
      new File(["otro contenido"], "otro_export_410.xlsx"),
    );
    expect(screen.queryByText(PREGUNTA_409)).toBeNull();
    expect(screen.queryByRole("button", { name: "Sí, reemplazarla" })).toBeNull();
  });
});
