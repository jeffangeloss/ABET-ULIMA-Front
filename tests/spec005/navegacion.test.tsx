// Escenarios @delegado_a_vitest de US-52 en specs/005-oportunidades-de-mejora/aceptacion/navegacion.feature del Back,
// con el título exacto de cada escenario. Antecedentes: docente410@example.invalid con la sesión iniciada en P2 y el
// fragmento #/secciones. tests/preparar.ts deja cada prueba sin fragmento.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";
import { json, simularApi, type Respuesta } from "../ayudas";
import { cargasDe410, constanciaConError, constanciaVigenteQueReemplaza, seccionPublicada, seccionSinCarga, usuarioProfesor } from "../respuestas";

const BACK_ANTERIOR = json(404, { detail: "Not Found" });
const NO_A_SU_CARGO = "La sección no está a su cargo.";

function sesion(rutas: Record<string, Respuesta> = {}) {
  return simularApi({
    "GET /api/sesion": json(200, usuarioProfesor),
    "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]),
    "GET /api/cargas": json(200, cargasDe410),
    "GET /api/cargas/11": json(200, constanciaVigenteQueReemplaza),
    "GET /api/cargas/11/indicadores": BACK_ANTERIOR,
    "GET /api/cargas/7": json(200, constanciaConError),
    "GET /api/cargas/7/indicadores": BACK_ANTERIOR,
    "DELETE /api/sesion": json(204),
    ...rutas,
  });
}

/** Los antecedentes. App abierta con sesión en P2, con el fragmento #/secciones. */
async function enP2() {
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Mis secciones" });
  expect(window.location.hash).toBe("#/secciones");
}

const titulo = (name: string) => screen.findByRole("heading", { level: 1, name });

async function atras() {
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 30));
  });
}

async function adelante() {
  await act(async () => {
    window.history.forward();
    await new Promise((r) => setTimeout(r, 30));
  });
}

const menu = () => within(screen.getByRole("navigation", { name: "Menú principal" }));

async function subirArchivo(u: ReturnType<typeof userEvent.setup>, nombre: string) {
  await u.upload(screen.getByLabelText("Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)"), new File(["x"], nombre));
  await u.click(screen.getByRole("button", { name: "Subir" }));
}

describe("US-52 · El botón atrás vuelve a la pantalla anterior", () => {
  it("Atrás recorre las pantallas visitadas y adelante las recupera", async () => {
    const { llamadas } = sesion();
    const u = userEvent.setup();
    await enP2();
    await u.click(menu().getByRole("button", { name: "Cargas" }));
    await titulo("Cargas");
    expect(window.location.hash).toBe("#/cargas");
    const li = (await screen.findByText("Carga 11")).closest("li") as HTMLElement;
    await u.click(within(li).getByRole("button", { name: "Ver constancia" }));
    await titulo("Resultado de la carga");
    expect(window.location.hash).toBe("#/cargas/11");

    await atras();
    expect(await titulo("Cargas")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/cargas");
    await atras();
    expect(await titulo("Mis secciones")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/secciones");
    await adelante();
    expect(await titulo("Cargas")).toBeInTheDocument();
    // Ninguna pulsación pide otra vez la sesión ni muestra el ingreso, y cada pantalla vuelve a pedir sus datos.
    expect(llamadas.filter((l) => l.clave === "GET /api/sesion")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Ingreso" })).toBeNull();
    expect(llamadas.filter((l) => l.clave === "GET /api/cargas").length).toBeGreaterThanOrEqual(2);
    // history.state lleva solo la ruta y la marca del ingreso.
    expect(Object.keys(window.history.state as object).sort()).toEqual(["ingreso", "ruta"]);
  });

  it("Después de una subida, atrás lleva a P2 sin repetir el POST", async () => {
    const { llamadas } = sesion({ "POST /api/secciones/2/cargas": json(201, constanciaConError) });
    const u = userEvent.setup();
    await enP2();
    const sinCarga = (await screen.findAllByRole("listitem"))[1];
    await u.click(within(sinCarga).getByRole("button", { name: "Subir export" }));
    await titulo("Subir export");
    expect(window.location.hash).toBe("#/secciones/2/subir");
    const entradas = window.history.length;
    await subirArchivo(u, "sintetico_20262_450002_410.xlsx");
    await titulo("Resultado de la carga");
    expect(window.location.hash).toBe("#/cargas/7");
    // P4 tomó la entrada de P3, porque la pantalla visible seguía siendo esa subida.
    expect(window.history.length).toBe(entradas);
    await atras();
    expect(await titulo("Mis secciones")).toBeInTheDocument();
    expect(llamadas.filter((l) => l.clave.startsWith("POST /api/secciones"))).toHaveLength(1);
  });

  it("La subida en modo reemplazo guarda la carga que reemplaza en la dirección", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
      "GET /api/cargas/12/indicadores": BACK_ANTERIOR,
      "POST /api/secciones/1/cargas?reemplaza=11": json(201, { ...constanciaVigenteQueReemplaza, carga_id: 12, reemplaza_carga_id: 11 }),
    });
    const u = userEvent.setup();
    await enP2();
    await u.click(menu().getByRole("button", { name: "Cargas" }));
    const li = (await screen.findByText("Carga 11")).closest("li") as HTMLElement;
    await u.click(within(li).getByRole("button", { name: "Reemplazar carga" }));
    await titulo("Subir export");
    expect(window.location.hash).toBe("#/secciones/1/subir?reemplaza=11");
    await subirArchivo(u, "sintetico_20262_450002_410.xlsx");
    await titulo("Resultado de la carga");
    expect(window.location.hash).toBe("#/cargas/12");
    await atras();
    expect(await titulo("Cargas")).toBeInTheDocument();
  });

  it("Un fragmento a una carga ajena muestra el 403 de P4", async () => {
    const { llamadas } = sesion({ "GET /api/cargas/999": json(403, { detail: NO_A_SU_CARGO }) });
    await enP2();
    await act(async () => {
      window.location.hash = "#/cargas/999";
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(await titulo("Resultado de la carga")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_A_SU_CARGO);
    expect(llamadas.filter((l) => l.clave === "GET /api/cargas/999")).toHaveLength(1);
    // Lo que no debe pasar: P4 de una carga que no se pudo leer no pide la ruta 13.
    expect(llamadas.some((l) => l.clave === "GET /api/cargas/999/indicadores")).toBe(false);
  });

  it("Después de salir, atrás muestra el ingreso y ninguna sección", async () => {
    sesion();
    const u = userEvent.setup();
    await enP2();
    await u.click(menu().getByRole("button", { name: "Cargas" }));
    await titulo("Cargas");
    await u.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/");
    await atras();
    expect(screen.getByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Mis secciones" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 1, name: "Cargas" })).toBeNull();
    expect(screen.queryByText(/sección 410/)).toBeNull();
  });

  it("un fragmento desconocido, una entrada de otro ingreso y P3 recargada llevan a la pantalla de llegada", async () => {
    sesion();
    window.history.replaceState(null, "", "#/secciones/1/subir");
    render(<App />);
    // P3 necesita la sección, que esta sesión todavía no abrió.
    expect(await titulo("Mis secciones")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/secciones");
    await act(async () => {
      window.location.hash = "#/no-existe";
      await new Promise((r) => setTimeout(r, 30));
    });
    await waitFor(() => expect(window.location.hash).toBe("#/secciones"));
    await act(async () => {
      window.history.pushState({ ruta: "#/cargas", ingreso: "otro-ingreso" }, "", "#/cargas");
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(await titulo("Mis secciones")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/secciones");
  });

  it("recargar en P4 conserva la pantalla por el fragmento", async () => {
    sesion();
    window.history.replaceState(null, "", "#/cargas/7");
    render(<App />);
    expect(await titulo("Resultado de la carga")).toBeInTheDocument();
    expect(await screen.findByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
  });
});
