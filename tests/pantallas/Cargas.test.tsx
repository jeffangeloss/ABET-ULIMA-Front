import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Cargas } from "../../src/pantallas/Cargas";
import type { Usuario } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  cargaRechazada410,
  cargaReemplazada410,
  cargasConCamposDeMas,
  cargasDe410,
  cargaVigente410,
  seccionPublicada,
  seccionSinCarga,
  usuarioCoordinador,
  usuarioProfesor,
} from "../respuestas";

const TITULO_410 = "450002 Principios de Ingeniería Sostenible, sección 410, 2026-2";
const TITULO_412 = "450010 Gestión Ambiental, sección 412, 2026-2";

function montar(usuario: Usuario = usuarioProfesor) {
  const props = { usuario, alVerResultado: vi.fn(), alReemplazar: vi.fn() };
  render(<Cargas {...props} />);
  return props;
}

function api(cargas: unknown = cargasDe410, secciones: unknown = [seccionPublicada, seccionSinCarga]) {
  return simularApi({ "GET /api/secciones": json(200, secciones), "GET /api/cargas": json(200, cargas) });
}

/** Elemento de la carga con ese número dentro de la lista de la sección. */
async function carga(id: number) {
  const titulo = await screen.findByText(`Carga ${id}`);
  return titulo.closest("li") as HTMLElement;
}

describe("P5 Cargas", () => {
  it("pide las secciones y las cargas y muestra cada sección en el orden de /api/secciones", async () => {
    const { llamadas } = api();
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Cargas" })).toHaveFocus();
    const titulos = await screen.findAllByRole("heading", { level: 2 });
    expect(titulos.map((t) => t.textContent)).toEqual([TITULO_410, TITULO_412]);
    expect(llamadas.map((l) => l.clave).sort()).toEqual(["GET /api/cargas", "GET /api/secciones"]);
    expect(screen.queryByText("Solo exports con códigos inventados (99000000 a 99999999)")).not.toBeInTheDocument();
  });

  it("las cargas de una sección van en el orden de la API, de la más reciente a la más antigua", async () => {
    api();
    montar();
    const seccion = await screen.findByRole("region", { name: TITULO_410 });
    const ids = within(seccion).getAllByText(/^Carga \d+$/).map((e) => e.textContent);
    expect(ids).toEqual(["Carga 11", "Carga 10", "Carga 9"]);
  });

  it("la vigente que reemplaza a otra muestra su marca, sus datos, el R-17 y el reemplazo", async () => {
    api();
    montar();
    const li = await carga(11);
    expect(li).toHaveTextContent("Publicada");
    expect(within(li).getByText("Vigente, reemplaza a la carga 10")).toBeInTheDocument();
    expect(li).toHaveTextContent("17/11/2026 10:15");
    expect(within(li).getByText("11 filas leídas, 11 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(li).toHaveTextContent("sintetico_20262_450002_410.xlsx");
    expect(within(li).getByText("Huella 3f2a9c1b7d4e")).toBeInTheDocument();
    expect(within(li).getByText("Subida por docente410@example.invalid")).toBeInTheDocument();
    // Spec 005, J-32. P5 no ofrece el R-17, porque «Ver constancia» abre P4, el único lugar que lo ofrece.
    expect(within(li).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(within(li).getByRole("button", { name: "Ver constancia" })).toBeInTheDocument();
    expect(within(li).getByRole("button", { name: "Reemplazar carga" })).toBeInTheDocument();
  });

  it("una publicada con un carga_id que no es entero positivo no ofrece el R-17 y el resto de la pantalla sigue", async () => {
    api([{ ...cargaVigente410, carga_id: "../../sesion?x=" }]);
    montar();
    const li = await carga("../../sesion?x=" as unknown as number);
    expect(within(li).queryByRole("link", { name: "Descargar R-17" })).not.toBeInTheDocument();
    expect(within(li).getByRole("button", { name: "Ver constancia" })).toBeInTheDocument();
  });

  it("una publicada que no reemplaza a nadie dice solo «Vigente»", async () => {
    api([{ ...cargaVigente410, reemplaza_carga_id: null }]);
    montar();
    const li = await carga(11);
    expect(within(li).getByText("Vigente")).toBeInTheDocument();
    expect(li).not.toHaveTextContent("reemplaza a la carga");
  });

  it("la REEMPLAZADA nombra a su sucesora y no ofrece R-17 ni reemplazo", async () => {
    api();
    montar();
    const li = await carga(10);
    expect(li).toHaveTextContent("Reemplazada");
    expect(within(li).getByText("Reemplazada por la carga 11")).toBeInTheDocument();
    expect(within(li).getByText("11 filas leídas, 10 aceptadas y 1 rechazada")).toBeInTheDocument();
    expect(li).not.toHaveTextContent("Vigente");
    expect(within(li).getByRole("button", { name: "Ver constancia" })).toBeInTheDocument();
    expect(within(li).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(within(li).queryByRole("button", { name: "Reemplazar carga" })).toBeNull();
  });

  it("la RECHAZADA no muestra el código de su motivo ni ofrece R-17 ni reemplazo", async () => {
    api();
    montar();
    const li = await carga(9);
    expect(li).toHaveTextContent("Rechazada");
    expect(within(li).getByText("0 filas leídas, 0 aceptadas y 0 rechazadas")).toBeInTheDocument();
    expect(screen.queryByText(/SECCION_NO_COINCIDE/)).toBeNull();
    expect(li).not.toHaveTextContent("Vigente");
    expect(within(li).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(within(li).queryByRole("button", { name: "Reemplazar carga" })).toBeNull();
  });

  it("una carga EN_CURSO dice «En curso» sin marca, sin R-17 y sin reemplazo", async () => {
    api([{ ...cargaRechazada410, estado: "EN_CURSO", motivo: null }]);
    montar();
    const li = await carga(9);
    expect(li).toHaveTextContent("En curso");
    expect(li).not.toHaveTextContent("Vigente");
    expect(within(li).queryByRole("button", { name: "Reemplazar carga" })).toBeNull();
  });

  it("una carga sin subida_por no muestra la línea de quién la sube", async () => {
    api([{ ...cargaVigente410, subida_por: null }]);
    montar();
    const li = await carga(11);
    expect(li).not.toHaveTextContent("Subida por");
    expect(li).not.toHaveTextContent("null");
  });

  it("una sección sin cargas dice «Sin cargas»", async () => {
    api();
    montar();
    const seccion = await screen.findByRole("region", { name: TITULO_412 });
    expect(within(seccion).getByText("Sin cargas")).toBeInTheDocument();
    expect(within(await screen.findByRole("region", { name: TITULO_410 })).queryByText("Sin cargas")).toBeNull();
  });

  it("sin secciones dice que no tiene secciones asignadas", async () => {
    api([], []);
    montar();
    expect(await screen.findByText("No tiene secciones asignadas en este periodo.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  // US-63 de la spec 007, esquema «Una lista vacía se explica según la cuenta», fila del coordinador en P5.
  it("al coordinador sin secciones le dice que la carrera no tiene secciones", async () => {
    api([], []);
    montar(usuarioCoordinador);
    expect(await screen.findByText("La carrera no tiene secciones en este periodo.")).toBeInTheDocument();
    expect(screen.queryByText("No tiene secciones asignadas en este periodo.")).toBeNull();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("«Ver constancia» abre P4 con la carga y «Reemplazar carga» abre P3 con la sección y la carga", async () => {
    api();
    const p = montar();
    await userEvent.click(within(await carga(10)).getByRole("button", { name: "Ver constancia" }));
    expect(p.alVerResultado).toHaveBeenCalledWith(10);
    await userEvent.click(within(await carga(11)).getByRole("button", { name: "Reemplazar carga" }));
    expect(p.alReemplazar).toHaveBeenCalledWith(seccionPublicada, 11);
  });

  it("el coordinador también ve «Reemplazar carga» en la publicada", async () => {
    api();
    montar(usuarioCoordinador);
    expect(within(await carga(11)).getByRole("button", { name: "Reemplazar carga" })).toBeInTheDocument();
    expect(within(await carga(10)).queryByRole("button", { name: "Reemplazar carga" })).toBeNull();
  });

  it.each([
    ["GET /api/cargas", 403, "La sección no está a su cargo."],
    ["GET /api/secciones", 500, "Ocurrió un error interno. Intente de nuevo."],
  ])("si falla %s muestra el detail como error y ninguna carga", async (ruta, status, detail) => {
    simularApi({
      "GET /api/secciones": json(200, [seccionPublicada]),
      "GET /api/cargas": json(200, cargasDe410),
      [ruta]: json(status, { detail }),
    });
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    expect(screen.queryByText(/^Carga \d+$/)).toBeNull();
  });

  it("no muestra nombres de estudiantes, valores leídos ni rutas locales", async () => {
    api(cargasConCamposDeMas);
    montar();
    await carga(11);
    expect(screen.queryByText(/Persona Inventada/)).toBeNull();
    expect(screen.queryByText(/99000002/)).toBeNull();
    expect(screen.queryByText(/C:\\|Users|Descargas/)).toBeNull();
    expect(screen.queryByText(/valor/i)).toBeNull();
    expect(document.body).not.toHaveTextContent("Persona Inventada");
    expect(document.body).not.toHaveTextContent("Descargas");
    expect(screen.queryAllByRole("link").every((a) => a.getAttribute("href")?.startsWith("/api/"))).toBe(true);
  });

  it("no ofrece borrar ni editar una carga", async () => {
    api();
    montar();
    await carga(11);
    expect(screen.queryByRole("button", { name: /borrar|eliminar|editar/i })).toBeNull();
  });

  it("no muestra la huella completa, solo sus 12 primeros caracteres", async () => {
    api([{ ...cargaReemplazada410 }]);
    montar();
    const li = await carga(10);
    expect(within(li).getByText("Huella b7c6d5e4f3a2")).toBeInTheDocument();
  });
});
