import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import { rotuloDeLogros, rotuloDeSecciones, sinSecciones } from "../../src/servicios/rotulos";
import type { Usuario } from "../../src/servicios/tipos";
import { json, simularApi } from "../ayudas";
import {
  avance5643,
  constanciaOtraSeccion701,
  seccion701,
  seccionQuimica,
  usuarioCoordinacionCarrera,
  usuarioCoordinacionCurso,
  usuarioCoordinador,
  usuarioDocente701,
} from "../respuestas";

// Escenarios @delegado_a_vitest de US-71 en specs/008-ciclo-quimica-industrial/aceptacion/alcance_coordinacion.feature
// del Back. Cada «it» lleva el título exacto del escenario, que anotan los pasos de pytest-bdd del Back. Los rótulos
// salen de alcance.tipo de la ruta 2 (contrato, sección 15.3) y el tipo Rol no cambia.

const secciones5643 = [seccion701, seccionQuimica(22, "702"), seccionQuimica(23, "703"), seccionQuimica(24, "704")];

describe("US-71 · Rótulos de la coordinación del curso", () => {
  // Cambio del 2026-11-23 (T046). La coordinación del curso llega a P7 (J-46 de la spec 007 y US-79), así que la prueba
  // abre P2 desde el menú, que suma «Avance del registro del curso» antes de los tres botones de T043.
  it("P2 rotula el curso y no ofrece subir", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioCoordinacionCurso),
      "GET /api/periodos": json(200, { vigente: "2026-2", periodos: ["2026-1"] }),
      "GET /api/avance?periodo=2026-1": json(200, avance5643),
      "GET /api/secciones?periodo=2026-1": json(200, secciones5643),
    });
    const u = userEvent.setup();
    render(<App />);
    const menu = within(await screen.findByRole("navigation", { name: "Menú principal" }));
    await u.click(menu.getByRole("button", { name: "Secciones del curso" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Secciones del curso" })).toBeInTheDocument();
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Avance del registro del curso",
      "Resumen del curso",
      "Secciones del curso",
      "Cargas",
      "Ver los logros por SO del curso",
    ]);
    expect(await screen.findAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Subir export" })).toBeNull();
    expect(screen.queryByText(/de la carrera/)).toBeNull();

    cleanup();
    simularApi({ "GET /api/secciones?periodo=2026-1": json(200, []) });
    render(<MisSecciones usuario={usuarioCoordinacionCurso} periodo="2026-1" alSubir={vi.fn()} alVerResultado={vi.fn()} />);
    expect(await screen.findByText("El curso no tiene secciones en este periodo.")).toBeInTheDocument();
    expect(screen.queryByText(/Elija otro periodo|escriba a la Coordinación/)).toBeNull();
  });

  // Cambio del 2026-11-23 (T046). La coordinación de la carrera llega a P7 con su título, «Avance del registro», y abre P2
  // desde el menú.
  it("La coordinación de la carrera conserva sus rótulos", async () => {
    simularApi({
      "GET /api/sesion": json(200, usuarioCoordinacionCarrera),
      "GET /api/periodos": json(200, { vigente: "2026-2", periodos: [] }),
      "GET /api/avance": json(200, { ...avance5643, periodo: "2026-2", conteo: { ...avance5643.conteo, secciones: 0 }, secciones: [] }),
      "GET /api/secciones": json(200, []),
    });
    const u = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Avance del registro" })).toBeInTheDocument();
    expect(await screen.findByText("La carrera no tiene secciones en este periodo.")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Secciones de la carrera" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Secciones de la carrera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver los logros por SO de la carrera" })).toBeInTheDocument();
    expect(await screen.findByText("La carrera no tiene secciones en este periodo.")).toBeInTheDocument();
    // Un Back anterior sin el campo alcance deja los rótulos de la carrera, y el profesor conserva los suyos.
    const sinAlcance: Usuario = usuarioCoordinador;
    expect([rotuloDeSecciones(sinAlcance), rotuloDeLogros(sinAlcance), sinSecciones(sinAlcance)]).toEqual([
      "Secciones de la carrera",
      "Ver los logros por SO de la carrera",
      "La carrera no tiene secciones en este periodo.",
    ]);
    expect([rotuloDeSecciones(usuarioDocente701), rotuloDeLogros(usuarioDocente701), sinSecciones(usuarioDocente701)]).toEqual([
      "Mis secciones",
      "Ver mis logros por SO",
      "No tiene secciones asignadas en este periodo.",
    ]);
  });

  // T053. El humo de Química encontró que, al ingresar, la coordinación del curso recibía los rótulos de la carrera
  // hasta recargar la página, porque la ruta 1 responde solo el correo y el rol (contrato, sección 2) y el alcance llega
  // en la ruta 2 (sección 15.3). Después del ingreso, el Front lee la ruta 2.
  it("Al ingresar, la coordinación del curso recibe los rótulos del curso sin recargar", async () => {
    let conSesion = false;
    const { llamadas } = simularApi({
      "GET /api/sesion": () =>
        conSesion ? json(200, usuarioCoordinacionCurso) : json(401, { detail: "La sesión venció. Ingrese otra vez." }),
      "POST /api/sesion": () => {
        conSesion = true;
        return json(200, { correo: usuarioCoordinacionCurso.correo, rol: "COORDINADOR" });
      },
      "GET /api/periodos": json(200, { vigente: "2026-2", periodos: ["2026-1"] }),
      "GET /api/avance?periodo=2026-1": json(200, avance5643),
    });
    const u = userEvent.setup();
    render(<App />);
    await u.type(await screen.findByLabelText("Correo"), usuarioCoordinacionCurso.correo);
    await u.type(screen.getByLabelText("Contraseña"), "clave-inventada");
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Avance del registro del curso" })).toBeInTheDocument();
    const menu = within(screen.getByRole("navigation", { name: "Menú principal" }));
    expect(menu.getByRole("button", { name: "Secciones del curso" })).toBeInTheDocument();
    expect(screen.queryByText(/de la carrera/)).toBeNull();
    expect(llamadas.map((l) => l.clave).filter((c) => c.endsWith("/api/sesion"))).toEqual([
      "GET /api/sesion",
      "POST /api/sesion",
      "GET /api/sesion",
    ]);
  });

  it("El consejo de una sección cruzada remite al profesor también para la coordinación del curso", () => {
    render(<ResultadoCarga cargaId={8} rol={usuarioCoordinacionCurso.rol} constanciaInicial={constanciaOtraSeccion701} alVolver={vi.fn()} />);
    expect(
      screen.getByText(
        "Qué corregir. El archivo no es de 5643, sección 701. Pida al profesor de esa sección que exporte su Centro de calificaciones y lo suba otra vez.",
        { selector: "p" },
      ),
    ).toBeInTheDocument();
  });
});
