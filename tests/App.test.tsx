import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { json, simularApi } from "./ayudas";
import {
  cargasDe410,
  constanciaConError,
  constanciaReemplazada,
  constanciaSinColumna,
  constanciaVigenteQueReemplaza,
  resultados410,
  resultadosDelCoordinador,
  seccionPublicada,
  seccionSinCarga,
  usuarioCoordinador,
  usuarioProfesor,
} from "./respuestas";

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
  it("sin sesión la cabecera no ofrece «Mis secciones» ni «Cargas»", async () => {
    simularApi({ "GET /api/sesion": json(401, { detail: "La sesión venció. Ingrese otra vez." }) });
    render(<App />);
    await screen.findByRole("heading", { name: "Ingreso" });
    expect(screen.queryByRole("button", { name: "Mis secciones" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cargas" })).toBeNull();
  });

  it("con sesión la cabecera lleva de P2 a P5 y de vuelta", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
    const cabecera = screen.getByRole("banner");
    await u.click(within(cabecera).getByRole("button", { name: "Cargas" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Cargas" })).toBeInTheDocument();
    expect(await screen.findByText("Carga 11")).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toContain("GET /api/cargas");
    await u.click(within(cabecera).getByRole("button", { name: "Mis secciones" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
  });

  it("«Reemplazar carga» de P5 abre P3 en modo reemplazo y la primera subida manda reemplaza", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
      "POST /api/secciones/1/cargas?reemplaza=11": json(201, { ...constanciaVigenteQueReemplaza, carga_id: 12, reemplaza_carga_id: 11 }),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
    await u.click(screen.getByRole("button", { name: "Cargas" }));
    const li = (await screen.findByText("Carga 11")).closest("li") as HTMLElement;
    await u.click(within(li).getByRole("button", { name: "Reemplazar carga" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Subir export" })).toBeInTheDocument();
    expect(screen.getByText("Reemplaza a la carga 11, la publicada de esta sección.")).toBeInTheDocument();
    expect(screen.getByText("450002 Principios de Ingeniería Sostenible, sección 410, 2026-2")).toBeInTheDocument();
    await u.upload(
      screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"),
      new File(["x"], "sintetico_20262_450002_410.xlsx"),
    );
    await u.click(screen.getByRole("button", { name: "Subir" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeInTheDocument();
    expect(llamadas.filter((l) => l.clave.startsWith("POST")).map((l) => l.clave)).toEqual([
      "POST /api/secciones/1/cargas?reemplaza=11",
    ]);
  });

  it("«Subir export» de P2 abre P3 sin modo reemplazo", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Subir export" }));
    await screen.findByRole("heading", { level: 1, name: "Subir export" });
    expect(screen.queryByText(/Reemplaza a la carga/)).toBeNull();
  });

  it("«Ver constancia» de P5 abre P4 con la carga reemplazada y su sucesora", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
      "GET /api/cargas/10": json(200, constanciaReemplazada),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
    await u.click(screen.getByRole("button", { name: "Cargas" }));
    const li = (await screen.findByText("Carga 10")).closest("li") as HTMLElement;
    await u.click(within(li).getByRole("button", { name: "Ver constancia" }));
    expect(await screen.findByText("La carga 11 la reemplaza, así que esta carga no tiene R-17.")).toBeInTheDocument();
  });

  // Spec 004, la pantalla P6 y sus enlaces (escenarios @delegado_a_vitest de resultados.feature del Back).

  it("la cabecera ofrece una sola vez «Ver mis logros por SO», que abre P6, y P6 vuelve a P2 con «Volver»", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/resultados": json(200, resultados410),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    expect(within(fila).getByRole("button", { name: "Subir export" })).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: "Ver resultado" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver mis logros por SO" })).toHaveLength(1);
    await u.click(within(screen.getByRole("banner")).getByRole("button", { name: "Ver mis logros por SO" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "SO 5" })).toBeInTheDocument();
    expect(llamadas.map((l) => l.clave)).toContain("GET /api/resultados");
    await u.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
  });

  it("P4 de una carga publicada ofrece también el enlace a P6", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas/7": json(200, constanciaConError),
      "GET /api/resultados": json(200, resultados410),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada");
    const enP4 = within(screen.getByRole("main")).getByRole("button", { name: "Ver mis logros por SO" });
    // P4 sigue sin porcentajes, que solo muestran P6 y el R-17 (invariante 8 de ADR-008).
    expect(screen.getByRole("main").textContent).not.toContain("%");
    await u.click(enP4);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeInTheDocument();
  });

  it("P4 de una carga que no está publicada no ofrece el enlace a P6", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [{ ...seccionPublicada, carga_id: 8 }]),
      "GET /api/cargas/8": json(200, constanciaSinColumna),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    await screen.findByText("No hay una carga publicada para esta sección");
    expect(within(screen.getByRole("main")).queryByRole("button", { name: "Ver mis logros por SO" })).toBeNull();
  });

  it("un 401 en P6 vuelve a P1 con el aviso de sesión vencida", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/resultados": json(401, { detail: "La sesión venció. Ingrese otra vez." }),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
    await u.click(screen.getByRole("button", { name: "Ver mis logros por SO" }));
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("La sesión venció. Ingrese otra vez.");
  });

  it("el coordinador abre P6 con «Ver los logros por SO de la carrera»", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioCoordinador),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/resultados": json(200, resultadosDelCoordinador),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
    expect(screen.queryByRole("button", { name: "Ver mis logros por SO" })).toBeNull();
    await u.click(within(screen.getByRole("banner")).getByRole("button", { name: "Ver los logros por SO de la carrera" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Logros por SO de la carrera" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Secciones" })).toBeInTheDocument();
  });
});
