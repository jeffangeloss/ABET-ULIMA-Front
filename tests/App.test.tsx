import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { json, simularApi } from "./ayudas";
import { constanciaConError, seccionPublicada, seccionSinCarga, usuarioProfesor } from "./respuestas";

describe("App", () => {
  it("sin sesión muestra P1", async () => {
    simularApi({ "GET /api/sesion": json(401, { detail: "La sesión venció. Ingrese otra vez." }) });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
  });

  it("con sesión muestra P2 con el correo y el botón para salir", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Mis secciones" })).toBeInTheDocument();
    expect(screen.getByText("docente410@example.invalid")).toBeInTheDocument();
  });

  it("un 401 en otra ruta devuelve a P1 con el aviso de sesión vencida", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(401, { detail: "La sesión venció. Ingrese otra vez." }),
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("La sesión venció. Ingrese otra vez.");
  });

  it("cerrar sesión llama a DELETE y vuelve a P1", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, []),
      "DELETE /api/sesion": json(204),
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Mis secciones" });
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toContain("DELETE /api/sesion");
  });

  it("recorre P1, P2, P3 y P4 con el export del rechazo de la fila 3 sin guardar nada en el navegador", async () => {
    simularApi({
      "GET /api/sesion": json(401, { detail: "La sesión venció. Ingrese otra vez." }),
      "POST /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionSinCarga]),
      "POST /api/secciones/2/cargas": json(201, constanciaConError),
    });
    const u = userEvent.setup();
    render(<App />);
    await u.type(await screen.findByLabelText("Correo"), "docente410@example.invalid");
    await u.type(screen.getByLabelText("Contraseña"), "clave-de-prueba");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Subir export" }));
    await u.upload(
      await screen.findByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"),
      new File(["x"], "export_inventado_412.xlsx"),
    );
    await u.click(screen.getByRole("button", { name: "Subir" }));
    expect(await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Avisos" })).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
