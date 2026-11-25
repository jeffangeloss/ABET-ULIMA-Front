import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { json, simularApi } from "./ayudas";
import {
  avanceAmbiental,
  cargaRechazada410,
  cargasDe410,
  cargaVigente410,
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
import { indicadores410, mejoraVacia } from "./respuestas_mejora";

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
    // US-60: el apartado «Antes de subir» llega con los PI de la fila elegida en P2.
    expect(within(screen.getByRole("region", { name: "Antes de subir" })).getAllByRole("listitem")[0]).toHaveTextContent(
      "En Blackboard, una columna por PI, con el nombre ABET SO5.1, ABET SO5.2 y ABET SO5.3.",
    );
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
      "GET /api/cargas/7/indicadores": json(200, indicadores410),
      "GET /api/cargas/7/mejora": json(200, mejoraVacia),
      "GET /api/resultados": json(200, resultados410),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    // P2 sigue sin porcentajes (invariante 8 de ADR-008, con la enmienda de ADR-009).
    expect(screen.getByRole("main").textContent).not.toContain("%");
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada");
    const enP4 = within(screen.getByRole("main")).getByRole("button", { name: "Ver mis logros por SO" });
    // Desde la spec 005, P4 muestra los porcentajes de la ruta 13 en «Cómo va su sección» (J-35, que cambia el invariante 8
    // de ADR-008).
    expect(await screen.findByRole("region", { name: "Cómo va su sección" })).toHaveTextContent("63,6 %");
    await u.click(enP4);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis logros por SO" })).toBeInTheDocument();
  });

  it("P4 de una carga que no está publicada no ofrece el enlace a P6", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [{ ...seccionSinCarga, seccion_id: 1, numero: "410", asignatura: seccionPublicada.asignatura }]),
      "GET /api/cargas": json(200, [cargaRechazada410, { ...cargaRechazada410, carga_id: 8 }]),
      "GET /api/cargas/9": json(200, { ...constanciaSinColumna, carga_id: 9 }),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    expect(within(fila).getByRole("button", { name: "Subir export" })).toBeEnabled();
    await u.click(within(fila).getByRole("button", { name: "Ver por qué se rechazó" }));
    expect(await screen.findByText("Esta carga no tiene R-17.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Constancia" })).toHaveTextContent(constanciaSinColumna.nombre_archivo);
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

  // Cambio del 2026-11-23 (T046 de la spec 008). El coordinador llega a P7 «Avance del registro» (J-46 de la spec 007,
  // SC-002), así que la prueba espera P7 marcada en el menú y no P2.
  it("el coordinador abre P6 con «Ver los logros por SO de la carrera»", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioCoordinador),
      "GET /api/avance": json(200, avanceAmbiental),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/resultados": json(200, resultadosDelCoordinador),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Avance del registro" });
    const menu = within(screen.getByRole("navigation", { name: "Menú principal" }));
    expect(menu.getAllByRole("button", { current: "page" })).toEqual([menu.getByRole("button", { name: "Avance del registro" })]);
    expect(menu.getByRole("button", { name: "Cargas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver mis logros por SO" })).toBeNull();
    await u.click(within(screen.getByRole("banner")).getByRole("button", { name: "Ver los logros por SO de la carrera" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Logros por SO de la carrera" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Secciones" })).toBeInTheDocument();
  });

  // US-63, esquema «La cabecera nombra lo que ve cada cuenta» de rotulos_por_cuenta.feature. Cambio del 2026-11-23 (T046 de
  // la spec 008). Desde la etapa B el coordinador llega a P7 y su menú suma «Avance del registro» antes de los tres
  // botones del esquema (US-65 de la spec 007) y, desde la spec 009, «Resumen del curso», así que la prueba abre P2 desde el menú antes de mirar su título.
  it.each([
    { usuario: usuarioProfesor, antes: [], secciones: "Mis secciones", logros: "Ver mis logros por SO", otro: "Secciones de la carrera" },
    { usuario: usuarioCoordinador, antes: ["Avance del registro", "Resumen del curso"], secciones: "Secciones de la carrera", logros: "Ver los logros por SO de la carrera", otro: "Mis secciones" },
  ])("con el rol $usuario.rol la cabecera dice «$secciones», «Cargas» y «$logros», y P2 lleva el título de su botón", async ({ usuario, antes, secciones, logros, otro }) => {
    simularApi({
      "GET /api/sesion": json(200, usuario),
      "GET /api/secciones": json(200, []),
      "GET /api/avance": json(200, { ...avanceAmbiental, conteo: { ...avanceAmbiental.conteo, secciones: 0 }, secciones: [] }),
    });
    const u = userEvent.setup();
    render(<App />);
    const menu = within(await screen.findByRole("navigation", { name: "Menú principal" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual([...antes, secciones, "Cargas", logros]);
    await u.click(menu.getByRole("button", { name: secciones }));
    expect(await screen.findByRole("heading", { level: 1, name: secciones })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: otro })).toBeNull();
    expect(screen.queryByRole("heading", { name: otro })).toBeNull();
  });

  it("US-63 marca solo la pantalla abierta en el menú del profesor, incluso al entrar y salir de P3 y P4", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
      "GET /api/cargas/7": json(200, constanciaConError),
      "GET /api/resultados": json(200, resultados410),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Mis secciones" });
    const nav = screen.getByRole("navigation", { name: "Menú principal" });
    // Un span solo admite contenido de frase, y nav es contenido de flujo.
    expect(nav.closest("span")).toBeNull();
    const menu = within(nav);
    function comprobarActual(nombre?: string) {
      const marcados = Array.from(nav.querySelectorAll("[aria-current]"));
      if (nombre) {
        expect(marcados).toEqual([menu.getByRole("button", { name: nombre, current: "page" })]);
      } else {
        expect(marcados).toHaveLength(0);
      }
    }
    comprobarActual("Mis secciones");
    await u.click(await screen.findByRole("button", { name: "Subir export" }));
    expect(screen.getByRole("heading", { name: "Subir export" })).toBeInTheDocument();
    comprobarActual();
    await u.click(screen.getByRole("button", { name: "Volver a mis secciones" }));
    await u.click(await screen.findByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByRole("region", { name: "Constancia" })).toBeInTheDocument();
    comprobarActual();
    await u.click(menu.getByRole("button", { name: "Ver mis logros por SO" }));
    expect(await screen.findByRole("region", { name: "SO 5" })).toBeInTheDocument();
    comprobarActual("Ver mis logros por SO");
    await u.click(menu.getByRole("button", { name: "Cargas" }));
    expect(await screen.findByText("Carga 11")).toBeInTheDocument();
    comprobarActual("Cargas");
  });

  it("US-62 muestra el resultado del reemplazo rechazado de la carga 7 sin afirmar que la sección perdió su publicación", async () => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, [{ ...cargaVigente410, carga_id: 7, reemplaza_carga_id: null }]),
      "POST /api/secciones/1/cargas?reemplaza=7": json(201, { ...constanciaSinColumna, carga_id: 12 }),
    });
    const u = userEvent.setup();
    render(<App />);
    await u.click(await screen.findByRole("button", { name: "Cargas" }));
    await u.click(await screen.findByRole("button", { name: "Reemplazar carga" }));
    await u.upload(screen.getByLabelText(/^Export de Blackboard/), new File(["inventado"], "export_inventado_410.xlsx"));
    await u.click(screen.getByRole("button", { name: "Subir" }));
    expect(await screen.findByText("Rechazada")).toBeInTheDocument();
    expect(screen.getByText("Esta carga no tiene R-17.")).toBeInTheDocument();
    expect(screen.queryByText("No hay una carga publicada para esta sección")).toBeNull();
    expect(llamadas.map((l) => l.clave)).not.toContain("GET /api/cargas/12");
  });
});
