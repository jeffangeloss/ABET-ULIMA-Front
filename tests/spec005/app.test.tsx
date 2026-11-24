// Escenarios @delegado_a_vitest de declaracion.feature del Back que necesitan App, con su título exacto: el 401 durante el
// guardado (US-48, AD-22) y los enlaces de P2, P5 y P6 hacia P4 (US-49, J-32).
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";
import { Cargas } from "../../src/pantallas/Cargas";
import { MisLogros } from "../../src/pantallas/MisLogros";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import type { CuerpoBorrador } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  cargasDe410,
  constanciaConError,
  resultados410,
  seccionPublicada,
  usuarioCoordinador,
  usuarioProfesor,
} from "../respuestas";
import { indicadores410, mejoraVacia, textos410 } from "../respuestas_mejora";

const VENCIDA = "La sesión venció. Ingrese otra vez.";
const GUARDADO = { version: 1, actualizado_en: "2026-11-21T15:10:00-05:00" };

/** App con docente410 en P2, la 410 publicada con la carga 7 y un PUT que responde 401 la primera vez. */
function api(usuarioQueVuelve = usuarioProfesor) {
  let veces = 0;
  let sesiones = 0;
  return simularApi({
    // P1 lee la ruta 2 después de ingresar, así que desde la segunda lectura la sesión es la del usuario que vuelve.
    "GET /api/sesion": () => json(200, ++sesiones === 1 ? usuarioProfesor : usuarioQueVuelve),
    "POST /api/sesion": json(200, usuarioQueVuelve),
    "DELETE /api/sesion": json(204),
    "GET /api/secciones": json(200, [seccionPublicada]),
    "GET /api/cargas/7": json(200, constanciaConError),
    "GET /api/cargas/7/indicadores": json(200, indicadores410),
    "GET /api/cargas/7/mejora": json(200, mejoraVacia),
    "PUT /api/cargas/7/mejora/borrador": () => (++veces === 1 ? json(401, { detail: VENCIDA }) : json(200, GUARDADO)),
  });
}

const puts = (llamadas: { clave: string; init: RequestInit | undefined }[]) =>
  llamadas.filter((l) => l.clave.startsWith("PUT ")).map((l) => JSON.parse(String(l.init!.body)) as CuerpoBorrador);

/** Abre P4 de la carga 7 desde P2 y escribe la causa de 5.1, que sale al salir del campo y recibe el 401. */
async function escribirYPerderLaSesion(u: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  const fila = (await screen.findAllByRole("listitem"))[0];
  await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
  const region = await screen.findByRole("region", { name: "Análisis por indicador" });
  const [causa] = within(region).getAllByRole("textbox");
  fireEvent.change(causa, { target: { value: textos410["5.1"].causa } });
  fireEvent.blur(causa);
  expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
  return causa;
}

async function ingresar(u: ReturnType<typeof userEvent.setup>, correo: string) {
  await u.type(screen.getByLabelText("Correo"), correo);
  await u.type(screen.getByLabelText("Contraseña"), "clave-de-prueba");
  await u.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("US-48 · El 401 durante el guardado", () => {
  it("Un 401 durante el guardado no pierde el texto", async () => {
    const { llamadas } = api();
    const u = userEvent.setup();
    const causa = await escribirYPerderLaSesion(u);
    // P4 queda oculta bajo el ingreso con el texto en memoria.
    expect(screen.getByRole("status")).toHaveTextContent(VENCIDA);
    expect(screen.queryByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeNull();
    expect(screen.getByDisplayValue(textos410["5.1"].causa)).toBe(causa);
    expect(causa).not.toBeVisible();
    await ingresar(u, usuarioProfesor.correo);
    // El mismo usuario recupera P4 y el guardado sale otra vez con la misma versión.
    expect(await screen.findByRole("heading", { level: 1, name: "Resultado de la carga" })).toBeInTheDocument();
    await waitFor(() => expect(puts(llamadas)).toHaveLength(2));
    expect(puts(llamadas)[1]).toEqual(puts(llamadas)[0]);
    expect(puts(llamadas)[1].version).toBe(0);
    expect(causa).toHaveValue(textos410["5.1"].causa);
    expect(causa).toBeVisible();
    expect(await screen.findByText("Borrador guardado a las 15:10")).toBeInTheDocument();
  });

  it("con otro usuario el texto del 401 se descarta", async () => {
    const otro = { correo: "docente411@example.invalid", rol: "PROFESOR" as const };
    const { llamadas } = api(otro);
    const u = userEvent.setup();
    await escribirYPerderLaSesion(u);
    await ingresar(u, otro.correo);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue(textos410["5.1"].causa)).toBeNull();
    expect(puts(llamadas)).toHaveLength(1);
  });

  it("después de «Salir» el texto se descarta", async () => {
    const { llamadas } = api();
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    const region = await screen.findByRole("region", { name: "Análisis por indicador" });
    fireEvent.change(within(region).getAllByRole("textbox")[0], { target: { value: textos410["5.1"].causa } });
    await u.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue(textos410["5.1"].causa)).toBeNull();
    await ingresar(u, usuarioProfesor.correo);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue(textos410["5.1"].causa)).toBeNull();
    void llamadas;
  });

  it("un 401 sin texto pendiente en P4 sigue llevando al ingreso y después a la pantalla de llegada", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "POST /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas/7": json(200, constanciaConError),
      "GET /api/cargas/7/indicadores": json(401, { detail: VENCIDA }),
    });
    const u = userEvent.setup();
    render(<App />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByRole("heading", { name: "Ingreso" })).toBeInTheDocument();
    expect(document.querySelector("[hidden]")).toBeNull();
    await ingresar(u, usuarioProfesor.correo);
    expect(await screen.findByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
  });
});

describe("US-49 · P4, único lugar del R-17", () => {
  it("P2, P5 y P6 no ofrecen el R-17 y llevan a P4", async () => {
    const vistas: number[] = [];
    const alVer = (id: number) => vistas.push(id);
    const u = userEvent.setup();

    // P2 del coordinador.
    simularApi({ "GET /api/secciones": json(200, [seccionPublicada]) });
    const p2 = render(<MisSecciones usuario={usuarioCoordinador} alSubir={() => undefined} alVerResultado={alVer} />);
    const fila = (await screen.findAllByRole("listitem"))[0];
    expect(within(fila).queryByRole("link", { name: /R-17/ })).toBeNull();
    await u.click(within(fila).getByRole("button", { name: "Ver resultado" }));
    p2.unmount();

    // P5 del coordinador.
    simularApi({ "GET /api/cargas": json(200, cargasDe410), "GET /api/secciones": json(200, [seccionPublicada]) });
    const p5 = render(<Cargas usuario={usuarioCoordinador} alVerResultado={alVer} alReemplazar={() => undefined} />);
    const li = (await screen.findByText("Carga 11")).closest("li") as HTMLElement;
    expect(screen.queryByRole("link", { name: /R-17/ })).toBeNull();
    await u.click(within(li).getByRole("button", { name: "Ver constancia" }));
    p5.unmount();

    // P6 del profesor.
    simularApi({ "GET /api/resultados": json(200, resultados410) });
    render(<MisLogros usuario={usuarioProfesor} alVolver={() => undefined} alVerCarga={alVer} />);
    const ver = await screen.findByRole("button", { name: "Ver la carga de la sección 410 de 450002" });
    expect(screen.queryByRole("link", { name: /R-17/ })).toBeNull();
    await u.click(ver);

    expect(vistas).toEqual([7, 11, 7]);
  });
});
