import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { Avance } from "../../src/pantallas/Avance";
import { json, simularApi } from "../ayudas";
import { avanceAmbiental, seccionPublicada, usuarioCoordinador, usuarioProfesor } from "../respuestas";

// Escenarios @delegado_a_vitest de US-65 en specs/007-experiencia-por-cuenta/aceptacion/avance_del_registro.feature del
// Back (T045 de la spec 007, construida con T046 de la spec 008) y la fila de P7 del esquema «El menú marca la pantalla
// actual» de rotulos_por_cuenta.feature. Cada «it» lleva el título del escenario, y cada esquema suma los valores de su
// fila de Ejemplos. La ruta 17 responde la del primer escenario de US-64 (contrato, sección 14.2).

/** Texto de cada fila de P7 en el orden del documento. */
function filas(): string[] {
  return screen.getAllByRole("listitem").map((li) => within(li).getByText(/^\d{3} · /).textContent ?? "");
}

describe("US-65 · La coordinación entra a P7 y ve cuántas secciones faltan", () => {
  it("P7 muestra el avance con texto, agrupado por asignatura", async () => {
    const { llamadas } = simularApi({ "GET /api/avance": json(200, avanceAmbiental) });
    const alVerCarga = vi.fn();
    const u = userEvent.setup();
    render(<Avance usuario={usuarioCoordinador} alVerCarga={alVerCarga} />);
    expect(screen.getByRole("heading", { level: 1, name: "Avance del registro" })).toHaveFocus();
    expect(await screen.findByText("1 de 5 secciones con carga publicada.")).toHaveAttribute("role", "status");
    expect(screen.getByText("1 sección sin plan de medición, en la que su profesor no puede subir el export.")).toBeInTheDocument();

    // Cada asignatura es una región con su código y su nombre, y sus filas van en el orden de la API.
    const grupos = screen.getAllByRole("region");
    expect(grupos.map((g) => within(g).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "450002 Principios de Ingeniería Sostenible",
      "450010 Gestión Sostenible de Residuos",
      "450020 Evaluación del Impacto Ambiental",
    ]);
    const enGrupo = (nombre: string) =>
      within(screen.getByRole("region", { name: nombre })).getAllByRole("listitem").map((li) => li.textContent);
    expect(enGrupo("450002 Principios de Ingeniería Sostenible")).toEqual([
      expect.stringContaining("410 · Publicada"),
      expect.stringContaining("411 · La última carga se rechazó"),
    ]);
    expect(enGrupo("450010 Gestión Sostenible de Residuos")).toEqual([
      expect.stringContaining("412 · Sin carga"),
      expect.stringContaining("413 · Sin profesor asignado"),
    ]);
    expect(enGrupo("450020 Evaluación del Impacto Ambiental")).toEqual([expect.stringContaining("414 · Sin plan de medición")]);

    // Cada etapa lleva su texto y además su marca de color, oculta al lector de pantalla, que no la repite.
    for (const li of screen.getAllByRole("listitem")) {
      const marca = li.querySelector("[data-etapa]");
      expect(marca).not.toBeNull();
      expect(marca).toHaveAttribute("aria-hidden", "true");
    }
    const etapas = screen.getAllByRole("listitem").map((li) => li.querySelector("[data-etapa]")?.getAttribute("data-etapa"));
    expect(etapas).toEqual(["PUBLICADA", "CON_RECHAZO", "SIN_CARGA", "SIN_PROFESOR", "SIN_PLAN"]);

    // Solo la 410, la única con carga publicada, ofrece «Ver la carga», que abre P4 de la carga 7.
    const ver = screen.getAllByRole("button", { name: "Ver la carga" });
    expect(ver).toHaveLength(1);
    expect(screen.getAllByRole("listitem")[0]).toContainElement(ver[0]);
    await u.click(ver[0]);
    expect(alVerCarga).toHaveBeenCalledWith(7);

    // P7 no calcula cifras ni muestra los correos del campo profesores, que esperan a D-47 (US-66).
    expect(document.body).not.toHaveTextContent(/@example\.invalid/);
    expect(document.body).not.toHaveTextContent(/%/);
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/avance"]);
  });

  it("El filtro deja solo las secciones que faltan", async () => {
    simularApi({ "GET /api/avance?periodo=2026-2": json(200, avanceAmbiental) });
    const u = userEvent.setup();
    render(<Avance usuario={usuarioCoordinador} periodo="2026-2" alVerCarga={vi.fn()} />);
    await screen.findByText(/con carga publicada/);
    expect(filas()).toEqual([
      "410 · Publicada",
      "411 · La última carga se rechazó",
      "412 · Sin carga",
      "413 · Sin profesor asignado",
      "414 · Sin plan de medición",
    ]);
    const filtro = screen.getByRole("checkbox", { name: "Mostrar solo las secciones que faltan" });
    expect(filtro).not.toBeChecked();
    await u.click(filtro);
    expect(filtro).toBeChecked();
    // La casilla cambia en el DOM antes de que React vuelva a pintar la lista, así que la lista filtrada se espera.
    await waitFor(() =>
      expect(filas()).toEqual([
        "411 · La última carga se rechazó",
        "412 · Sin carga",
        "413 · Sin profesor asignado",
        "414 · Sin plan de medición",
      ]),
    );
    expect(screen.queryByRole("button", { name: "Ver la carga" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 5 secciones con carga publicada.");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    await u.click(filtro);
    await waitFor(() => expect(filas()).toHaveLength(5));
  });

  it.each([
    { usuario: usuarioProfesor, rol: "PROFESOR", pagina: "Mis secciones" },
    { usuario: usuarioCoordinador, rol: "COORDINADOR", pagina: "Avance del registro" },
  ])("Cada cuenta entra a su página ($rol)", async ({ usuario, pagina }) => {
    const { llamadas } = simularApi({
      "GET /api/sesion": json(401, { detail: "La sesión venció. Ingrese otra vez." }),
      "POST /api/sesion": json(200, usuario),
      "GET /api/periodos": json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, []),
      "GET /api/avance": json(200, avanceAmbiental),
    });
    const u = userEvent.setup();
    render(<App />);
    await u.type(await screen.findByLabelText("Correo"), usuario.correo);
    await u.type(screen.getByLabelText("Contraseña"), "clave-de-prueba");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("heading", { level: 1, name: pagina })).toBeInTheDocument();
    const menu = within(screen.getByRole("navigation", { name: "Menú principal" }));
    const botones = menu.getAllByRole("button").map((b) => b.textContent);
    const pedidas = llamadas.map((l) => l.clave);
    if (usuario.rol === "PROFESOR") {
      expect(botones).not.toContain("Avance del registro");
      expect(pedidas).not.toContain("GET /api/avance");
    } else {
      expect(botones.slice(0, 2)).toEqual(["Avance del registro", "Secciones de la carrera"]);
      // La llegada es P7, así que P2 no se pide hasta que la coordinación la abre.
      expect(pedidas).toContain("GET /api/avance");
      expect(pedidas).not.toContain("GET /api/secciones");
    }
  });

  // Espera a US-52 de la spec 005, la navegación por fragmento, que el Front todavía no tiene. Sin ella no hay botón
  // atrás del navegador que vuelva a P7 ni una dirección «#/avance» que recargar.
  it.todo("Atrás desde P4 abierta con «Ver la carga» vuelve a P7");

  it("P7 sin secciones lo dice con el texto de la carrera", async () => {
    simularApi({
      "GET /api/avance": json(200, {
        periodo: "2026-2",
        conteo: { secciones: 0, PUBLICADA: 0, CON_RECHAZO: 0, SIN_CARGA: 0, SIN_PROFESOR: 0, SIN_PLAN: 0 },
        secciones: [],
      }),
    });
    render(<Avance usuario={usuarioCoordinador} alVerCarga={vi.fn()} />);
    expect(await screen.findByText("La carrera no tiene secciones en este periodo.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/con carga publicada/)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  // Caso borde de la spec 007 (spec.md, «Edge Cases»), que no tiene escenario propio en el .feature.
  it("Con una sola sección publicada, P7 usa el singular", async () => {
    simularApi({
      "GET /api/avance": json(200, {
        periodo: "2026-2",
        conteo: { secciones: 1, PUBLICADA: 1, CON_RECHAZO: 0, SIN_CARGA: 0, SIN_PROFESOR: 0, SIN_PLAN: 0 },
        secciones: [avanceAmbiental.secciones[0]],
      }),
    });
    render(<Avance usuario={usuarioCoordinador} alVerCarga={vi.fn()} />);
    expect(await screen.findByText("1 de 1 sección con carga publicada.")).toHaveAttribute("role", "status");
    expect(screen.queryByText(/sin plan de medición/)).toBeNull();
    expect(filas()).toEqual(["410 · Publicada"]);
  });

  it("P7 muestra el error de la ruta 17 con su detail y ninguna fila", async () => {
    simularApi({ "GET /api/avance": json(403, { detail: "Esta página es de la Coordinación." }) });
    render(<Avance usuario={usuarioCoordinador} alVerCarga={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Esta página es de la Coordinación.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});

describe("US-63 · El menú marca la pantalla actual, etapa B", () => {
  it("El menú marca la pantalla actual (P7 «Avance del registro»)", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioCoordinador),
      "GET /api/periodos": json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/avance": json(200, avanceAmbiental),
    });
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Avance del registro" });
    const nav = screen.getByRole("navigation", { name: "Menú principal" });
    const menu = within(nav);
    const marcados = () => Array.from(nav.querySelectorAll("[aria-current]"));
    expect(marcados()).toEqual([menu.getByRole("button", { name: "Avance del registro", current: "page" })]);
    await u.click(menu.getByRole("button", { name: "Secciones de la carrera" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Secciones de la carrera" })).toBeInTheDocument();
    expect(marcados()).toEqual([menu.getByRole("button", { name: "Secciones de la carrera", current: "page" })]);
    await u.click(menu.getByRole("button", { name: "Avance del registro" }));
    expect(await screen.findByText("1 de 5 secciones con carga publicada.")).toHaveAttribute("role", "status");
    expect(marcados()).toEqual([menu.getByRole("button", { name: "Avance del registro", current: "page" })]);
  });
});
