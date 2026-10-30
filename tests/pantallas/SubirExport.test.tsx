import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubirExport } from "../../src/pantallas/SubirExport";
import { json, simularApi } from "../ayudas";
import { constanciaConError, constanciaSinColumna, seccionSinCarga } from "../respuestas";

const RUTA = "POST /api/secciones/2/cargas";
const archivo = () =>
  new File(["contenido inventado"], "export_inventado_412.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

function montar() {
  const props = { seccion: seccionSinCarga, alResultado: vi.fn(), alVolver: vi.fn(), alVerResultado: vi.fn() };
  render(<SubirExport {...props} />);
  return props;
}

async function subir() {
  const u = userEvent.setup();
  await u.upload(screen.getByLabelText("Export de Blackboard (.xlsx, hasta 1 MB)"), archivo());
  await u.click(screen.getByRole("button", { name: "Subir" }));
}

describe("P3 Subir export", () => {
  it("muestra la sección elegida fija, el campo .xlsx, el botón Subir y el rótulo del piloto", () => {
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Subir export" })).toHaveFocus();
    expect(screen.getByText("450010 Gestión Ambiental, sección 412, 2026-2")).toBeInTheDocument();
    const campo = screen.getByLabelText("Export de Blackboard (.xlsx, hasta 1 MB)");
    expect(campo).toHaveAttribute("type", "file");
    expect(campo).toHaveAttribute("accept", ".xlsx");
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
    [422, "El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja."],
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
    expect(await screen.findByRole("alert")).toHaveTextContent("Elija el archivo .xlsx del export.");
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
    const campo = screen.getByLabelText("Export de Blackboard (.xlsx, hasta 1 MB)");
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
    expect(screen.getAllByLabelText("Export de Blackboard (.xlsx, hasta 1 MB)")).toHaveLength(1);
  });

  it("no muestra vista previa, ruta local ni códigos de estudiantes, y vuelve a P2", async () => {
    const p = montar();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/99000002|C:\\|\/Users\//)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    expect(p.alVolver).toHaveBeenCalled();
  });
});
