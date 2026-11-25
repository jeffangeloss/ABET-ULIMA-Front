import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { MisSecciones } from "../../src/pantallas/MisSecciones";
import { json, simularApi } from "../ayudas";
import {
  cargaRechazada410,
  cargaVigente410,
  constanciaOtraSeccion,
  seccionPublicada,
  seccionSinCarga,
  seccionSinPlan,
  usuarioCoordinador,
  usuarioProfesor,
} from "../respuestas";

const acciones = () => ({ alSubir: vi.fn(), alVerResultado: vi.fn() });

const faltaExport = "Falta subir el export de Blackboard de esta sección.";
const faltaCorregir = "La última carga se rechazó y no se publicó. Falta subir un export corregido.";
const revisarPublicada = "Revise el resultado de la carga para completar lo que falte y descargar el R-17.";
const esperarPlan = "Por ahora no hay nada que hacer. La Coordinación de la carrera registra el plan de medición.";
const sinPlan = "La carrera aún no registra el plan de medición de esta sección";
const sinSecciones = "Si dicta una sección con medición ABET en este periodo, escriba a la Coordinación de la carrera.";
const sinCarga410 = {
  ...seccionSinCarga, seccion_id: 1, asignatura: seccionPublicada.asignatura, numero: "410", pi: seccionPublicada.pi,
};
const sinPlan410 = { ...sinCarga410, tiene_plan: false, pi: [] };

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

  it("el coordinador no ve Subir export, ve Ver resultado y P2 ya no ofrece Descargar R-17", async () => {
    const { llamadas } = simularApi({ "GET /api/secciones": json(200, [seccionPublicada, seccionSinCarga]) });
    render(<MisSecciones usuario={usuarioCoordinador} {...acciones()} />);
    const filas = await screen.findAllByRole("listitem");
    expect(screen.queryByRole("button", { name: "Subir export" })).toBeNull();
    expect(within(filas[0]).getByRole("button", { name: "Ver resultado" })).toBeInTheDocument();
    // Spec 005, J-32. Hasta el 2026-11-24 este caso comprobaba la descarga del R-17 publicada. Desde la spec 005 P2 no
    // ofrece el R-17 y el título lo dice, porque «Ver resultado» abre P4, el único lugar que lo ofrece con la declaración.
    expect(within(filas[0]).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(within(filas[1]).queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    expect(screen.queryByText(revisarPublicada)).toBeNull();
    expect(screen.queryByText(faltaExport)).toBeNull();
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/secciones"]);
  });

  it("sin secciones muestra un texto y no una lista vacía", async () => {
    const { llamadas } = simularApi({ "GET /api/secciones": json(200, []) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    expect(await screen.findByText("No tiene secciones asignadas en este periodo.")).toBeInTheDocument();
    expect(screen.getByText(sinSecciones, { selector: "p" })).toAppearAfter(
      screen.getByText("No tiene secciones asignadas en este periodo.", { selector: "p" }),
    );
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/secciones"]);
    expect(screen.queryByRole("list")).toBeNull();
  });

  // US-63, esquema «Una lista vacía se explica según la cuenta», fila del coordinador en P2.
  it("al coordinador sin secciones le habla de la carrera, sin la línea del profesor ni la ruta 8", async () => {
    const { llamadas } = simularApi({ "GET /api/secciones": json(200, []) });
    render(<MisSecciones usuario={usuarioCoordinador} {...acciones()} />);
    expect(await screen.findByText("La carrera no tiene secciones en este periodo.")).toBeInTheDocument();
    expect(screen.queryByText("No tiene secciones asignadas en este periodo.")).toBeNull();
    expect(screen.queryByText(sinSecciones)).toBeNull();
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/secciones"]);
  });

  it("al coordinador lo titula «Secciones de la carrera» y al profesor «Mis secciones»", async () => {
    simularApi({ "GET /api/secciones": json(200, []) });
    const vista = render(<MisSecciones usuario={usuarioCoordinador} {...acciones()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Secciones de la carrera" })).toHaveFocus();
    expect(screen.queryByRole("heading", { name: "Mis secciones" })).toBeNull();
    await screen.findByText("La carrera no tiene secciones en este periodo.");
    vista.unmount();
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mis secciones" })).toBeInTheDocument();
    await screen.findByText("No tiene secciones asignadas en este periodo.");
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
    expect(screen.queryByText("Solo exports con códigos inventados (99000000 a 99999999)")).not.toBeInTheDocument();
    await screen.findByText("No tiene secciones asignadas en este periodo.");
  });
});

describe("US-59, siguiente paso de cada sección", () => {
  // Esquema «La línea de lo que falta sale del estado de la sección» de siguiente_paso.feature, con sus cuatro Ejemplos.
  it.each([
    { caso: "con plan, sin carga y sin cargas", seccion: sinCarga410, cargas: [], estado: "Sin carga", linea: faltaExport },
    { caso: "con plan, sin carga y una RECHAZADA", seccion: sinCarga410, cargas: [cargaRechazada410], estado: "Sin carga",
      linea: faltaCorregir },
    { caso: "con plan y PUBLICADA", seccion: seccionPublicada, cargas: [{ ...cargaVigente410, carga_id: 7, reemplaza_carga_id: null }],
      estado: "Publicada, 11 de 11 filas aceptadas", linea: revisarPublicada },
    { caso: "sin plan y sin cargas", seccion: sinPlan410, cargas: [], estado: sinPlan, linea: esperarPlan },
  ])("la sección $caso conserva su texto y dice debajo lo que falta", async ({ seccion, cargas, estado, linea }) => {
    simularApi({ "GET /api/secciones": json(200, [seccion]), "GET /api/cargas": json(200, cargas) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const fila = within(await screen.findByRole("listitem"));
    const textoActual = fila.getByText(estado, { selector: "p" });
    const siguientePaso = await fila.findByText(linea, { selector: "p" });
    expect(siguientePaso).toAppearAfter(textoActual);
    expect(siguientePaso).not.toBe(textoActual);
    for (const otra of [faltaExport, faltaCorregir, revisarPublicada, esperarPlan].filter((t) => t !== linea)) {
      expect(fila.queryByText(otra)).toBeNull();
    }
    const ofreceRechazo = linea === faltaCorregir;
    expect(fila.queryAllByRole("button", { name: "Ver por qué se rechazó" })).toHaveLength(ofreceRechazo ? 1 : 0);
  });

  // Casos borde de la spec 007: una carga EN_CURSO no cuenta, la sección sin plan conserva su línea aunque tenga
  // rechazos, y una sección publicada no vuelve a «La última carga se rechazó» por un rechazo posterior.
  it.each([
    { caso: "solo tiene una carga EN_CURSO", seccion: sinCarga410, cargas: [{ ...cargaVigente410, estado: "EN_CURSO" }],
      estado: "Sin carga", linea: faltaExport },
    { caso: "no tiene plan y sí una carga RECHAZADA", seccion: sinPlan410, cargas: [cargaRechazada410], estado: sinPlan,
      linea: esperarPlan },
    { caso: "está publicada con una carga RECHAZADA más reciente", seccion: seccionPublicada,
      cargas: [cargaRechazada410, cargaVigente410], estado: "Publicada, 11 de 11 filas aceptadas", linea: revisarPublicada },
    { caso: "no tiene rechazos propios aunque otra sección sí", seccion: sinCarga410,
      cargas: [{ ...cargaRechazada410, seccion: { ...cargaRechazada410.seccion, seccion_id: 2 } }], estado: "Sin carga",
      linea: faltaExport },
  ])("cuando la sección $caso, la línea es la de su estado y no ofrece «Ver por qué se rechazó»", async ({ seccion, cargas, estado, linea }) => {
    simularApi({ "GET /api/secciones": json(200, [seccion]), "GET /api/cargas": json(200, cargas) });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const fila = within(await screen.findByRole("listitem"));
    expect(await fila.findByText(linea, { selector: "p" })).toAppearAfter(fila.getByText(estado, { selector: "p" }));
    expect(fila.queryByText(faltaCorregir)).toBeNull();
    expect(fila.queryByRole("button", { name: "Ver por qué se rechazó" })).toBeNull();
  });

  it("el botón anuncia el siguiente paso de su propia sección o el motivo de su desactivación", async () => {
    const { llamadas } = simularApi({
      "GET /api/secciones": json(200, [sinCarga410, seccionSinPlan]),
      "GET /api/cargas": json(200, []),
    });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const [activo, desactivado] = await screen.findAllByRole("button", { name: "Subir export" });
    expect(activo).toBeEnabled();
    expect(activo).toHaveAccessibleDescription(faltaExport);
    expect(desactivado).toBeDisabled();
    expect(desactivado).toHaveAccessibleDescription(sinPlan);
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/secciones", "GET /api/cargas"]);
  });

  it("abre P4 de la primera rechazada de esa sección en el orden de la ruta 8", async () => {
    const otra410 = { ...seccionSinCarga, numero: "410" };
    const { llamadas } = simularApi({
      "GET /api/sesion": json(200, usuarioProfesor),
      "GET /api/secciones": json(200, [sinCarga410, otra410]),
      "GET /api/cargas": json(200, [
        { ...cargaRechazada410, carga_id: 12, seccion: { ...cargaRechazada410.seccion, seccion_id: 2, asignatura: "450010" } },
        cargaRechazada410,
        { ...cargaRechazada410, carga_id: 8 },
      ]),
      "GET /api/cargas/9": json(200, constanciaOtraSeccion),
    });
    render(<App />);
    const [primera] = await screen.findAllByRole("listitem");
    expect(within(primera).getByRole("button", { name: "Subir export" })).toBeEnabled();
    await userEvent.click(within(primera).getByRole("button", { name: "Ver por qué se rechazó" }));
    expect(await screen.findByRole("heading", { name: "Constancia" })).toBeInTheDocument();
    expect(screen.getByText(constanciaOtraSeccion.nombre_archivo)).toBeInTheDocument();
    // Spec 008, US-73. App.tsx pide la ruta 18 antes de P2, y aquí no está simulada, así que P2 sigue sin periodo.
    expect(llamadas.map((l) => l.clave)).toEqual(["GET /api/sesion", "GET /api/periodos", "GET /api/secciones", "GET /api/cargas", "GET /api/cargas/9"]);
  });

  it("conserva las secciones y permite subir si la ruta 8 da 500", async () => {
    simularApi({
      "GET /api/secciones": json(200, [sinCarga410]),
      "GET /api/cargas": json(500, { detail: "No se pudo leer el historial." }),
    });
    render(<MisSecciones usuario={usuarioProfesor} {...acciones()} />);
    const fila = within(await screen.findByRole("listitem"));
    expect(fila.getByText(faltaExport)).toBeInTheDocument();
    expect(fila.getByRole("button", { name: "Subir export" })).toBeEnabled();
    expect(fila.queryByRole("button", { name: "Ver por qué se rechazó" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
