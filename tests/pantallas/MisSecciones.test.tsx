import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import { json, simularApi } from "../ayudas";
import {
  seccionPublicada,
  seccionSinCarga,
  seccionSinPlan,
  usuarioCoordinador,
  usuarioProfesor,
} from "../respuestas";

const acciones = () => ({ alSubir: vi.fn(), alVerResultado: vi.fn() });

describe("P2 Mis secciones", () => {
  it("lista todas las secciones del profesor, una fila por sección, con su estado de carga", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const filas = await screen.findAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent("450002 Principios de Ingeniería Sostenible, sección 410, 2026-2");
    expect(filas[0]).toHaveTextContent("5.1, 5.2, 5.3");
    expect(filas[0]).toHaveTextContent("Publicada, 11 de 11 filas aceptadas");
    expect(filas[1]).toHaveTextContent("450010 Gestión Ambiental, sección 412, 2026-2");
    expect(filas[1]).toHaveTextContent("Sin carga");
  });

  it("dos secciones de una misma asignatura aparecen como filas distintas", async () => {
    const otra = { ...seccionSinCarga, seccion_id: 4, numero: "410" };
    simularApi({ "GET /api/secciones": json(200, [seccionSinCarga, otra]) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const filas = await screen.findAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent("sección 412");
    expect(filas[1]).toHaveTextContent("sección 410");
  });

  it("Subir export abre P3 con la sección de esa fila", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]) });
    const a = acciones();
    render(<MisSecciones usuario={usuarioProfesor} {...a} />);
    const filas = await screen.findAllByRole("listitem");
    await userEvent.click(within(filas[1]).getByRole("button", { name: "Subir export" }));
    expect(a.alSubir).toHaveBeenCalledWith(seccionSinCarga);
  });

  it("la sección con carga publicada ofrece el enlace a su resultado", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]) });
    const a = acciones();
    render(<MisSecciones usuario={usuarioProfesor} {...a} />);
    const filas = await screen.findAllByRole("listitem");
    await userEvent.click(within(filas[0]).getByRole("button", { name: "Ver resultado" }));
    expect(a.alVerResultado).toHaveBeenCalledWith(7);
    expect(within(filas[1]).queryByRole("button", { name: "Ver resultado" })).toBeNull();
  });

  it("una sección sin plan de medición lo dice y deja Subir export desactivado", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionSinPlan]) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    expect(fila).toHaveTextContent("La carrera aún no registra el plan de medición de esta sección");
    expect(within(fila).getByRole("button", { name: "Subir export" })).toBeDisabled();
  });

  it("el coordinador no ve Subir export y sí el resultado y la descarga del R-17 publicada", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]) });
    render(<MisSecciones usuario={usuarioCoordinador} {...acciones()} />);
    const filas = await screen.findAllByRole("listitem");
    expect(screen.queryByRole("button", { name: "Subir export" })).toBeNull();
    expect(within(filas[0]).getByRole("button", { name: "Ver resultado" })).toBeInTheDocument();
    expect(within(filas[0]).getByRole("link", { name: "Descargar R-17" })).toHaveAttribute(
      "href",
      "/api/cargas/7/r17.xlsx",
    );
    expect(within(filas[1]).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
  });

  it("sin secciones muestra un texto y no una lista vacía", async () => {
    simularApi({ "GET /api/secciones": json(200, []) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    expect(await screen.findByText("No tiene secciones asignadas en este periodo.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("un error de la API se muestra con su detail", async () => {
    simularApi({ "GET /api/secciones": json(500, { detail: "Error interno." }) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno.");
  });

  it("no muestra cantidades ni nombres de estudiantes, porcentajes ni filtros", async () => {
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada]) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    await screen.findAllByRole("listitem");
    expect(screen.queryByText(/estudiantes|%/i)).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("muestra el rótulo del piloto y mueve el foco al título", async () => {
    simularApi({ "GET /api/secciones": json(200, []) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mis secciones" })).toHaveFocus();
    expect(screen.getByText("Solo exports con códigos inventados (99000000 a 99999999)")).toBeInTheDocument();
    await screen.findByText("No tiene secciones asignadas en este periodo.");
  });
});
