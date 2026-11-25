import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { COLORES, MisLogros } from "../../src/pantallas/MisLogros";
import type { Resultados, Usuario } from "../../src/servicios/tipos";
import { json, simularApi, type Respuesta } from "../ayudas";
import {
  SO_2,
  SO_5,
  indicador,
  resultados410,
  resultadosConUnaPublicada,
  resultadosDeVarias,
  resultadosDelCoordinador,
  resultadosSinMedir,
  seccionConCarga,
  seccionSinCargaDeLogros,
  usuarioCoordinador,
  usuarioProfesor,
} from "../respuestas";

// Escenarios @delegado_a_vitest de specs/004-reportes-docente/aceptacion/ del Back. Cada «it» lleva el nombre que anotan
// tests/aceptacion/pasos/test_resultados_feature.py y test_alcance_resultados_feature.py del Back.

const profesorVarias: Usuario = { correo: "docente.varias@example.invalid", rol: "PROFESOR" };

async function abrir(respuesta: Resultados | Respuesta, usuario: Usuario = profesorVarias) {
  simularApi({ "GET /api/resultados": "status" in respuesta ? respuesta : json(200, respuesta) });
  const alVolver = vi.fn();
  const alVerCarga = vi.fn();
  const vista = render(<MisLogros usuario={usuario} alVolver={alVolver} alVerCarga={alVerCarga} />);
  return { ...vista, alVolver, alVerCarga };
}

function region(nombre: string) {
  return screen.getByRole("region", { name: nombre });
}

/** Texto principal de cada fila de un grupo de SO, en el orden de la pantalla. */
function filas(nombre: string): string[] {
  return within(region(nombre))
    .queryAllByRole("listitem")
    .map((li) => li.querySelector("p")?.textContent ?? "");
}

function fila(nombre: string, inicio: string): HTMLElement {
  const encontradas = within(region(nombre))
    .getAllByRole("listitem")
    .filter((li) => (li.querySelector("p")?.textContent ?? "").startsWith(inicio));
  expect(encontradas).toHaveLength(1);
  return encontradas[0];
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (oscura + 0.05);
}

describe("P6 Mis logros por SO", () => {
  it("agrupa los PI bajo su SO y cada fila escribe su PI, su sección, su porcentaje, su fracción y su estado", async () => {
    await abrir(resultadosDeVarias);
    expect(await screen.findByRole("region", { name: "SO 5" })).toBeInTheDocument();
    expect(region("SO 2")).toHaveTextContent(SO_2.descripcion);
    expect(region("SO 5")).toHaveTextContent(SO_5.descripcion);
    expect(filas("SO 2")).toEqual([
      "2.1 · Sección 410 de 450010 · 72,7 % (8 de 11) · Debajo de la meta",
      "2.2 · Sección 410 de 450010 · 45,5 % (5 de 11) · Debajo de la meta",
      "2.1 · Sección 412 de 450010 · 90,9 % (10 de 11) · En la meta",
      "2.2 · Sección 412 de 450010 · 63,6 % (7 de 11) · Debajo de la meta",
    ]);
    expect(filas("SO 5")).toEqual([
      "5.1 · Sección 412 de 450002 · 81,8 % (9 de 11) · En la meta",
      "5.2 · Sección 412 de 450002 · 54,5 % (6 de 11) · Debajo de la meta",
      "5.3 · Sección 412 de 450002 · 90,9 % (10 de 11) · En la meta",
      "5.1 · Sección 410 de 450010 · 36,4 % (4 de 11) · Debajo de la meta",
      "5.1 · Sección 412 de 450010 · 54,5 % (6 de 11) · Debajo de la meta",
    ]);
    const todas = [...filas("SO 2"), ...filas("SO 5")];
    expect(todas.filter((t) => t.endsWith(" · En la meta"))).toHaveLength(3);
    expect(todas.filter((t) => t.endsWith(" · Debajo de la meta"))).toHaveLength(6);
    expect(within(fila("SO 5", "5.1 · Sección 412 de 450002")).getByText("Instrumento: Trabajo Integrador")).toBeInTheDocument();
  });

  it("cada barra lleva aria-hidden, su ancho es el porcentaje y la meta va marcada con una línea y con texto", async () => {
    await abrir(resultadosDeVarias);
    await screen.findByRole("region", { name: "SO 5" });
    const esperados: Record<string, [string, boolean]> = {
      "5.1 · Sección 412 de 450002": ["81.8%", true],
      "5.2 · Sección 412 de 450002": ["54.5%", false],
      "2.1 · Sección 412 de 450010": ["90.9%", true],
      "2.2 · Sección 410 de 450010": ["45.5%", false],
    };
    for (const [inicio, [ancho, enMeta]] of Object.entries(esperados)) {
      const li = fila(inicio.startsWith("2.") ? "SO 2" : "SO 5", inicio);
      const barra = li.querySelector<HTMLElement>('[data-barra="logro"]');
      expect(barra).not.toBeNull();
      expect(barra).toHaveAttribute("aria-hidden", "true");
      const lleno = barra!.querySelector<HTMLElement>("[data-lleno]");
      expect(lleno?.style.width).toBe(ancho);
      expect(lleno?.style.backgroundColor).toBe(enMeta ? "rgb(4, 120, 87)" : "rgb(180, 83, 9)");
      expect(barra!.querySelector<HTMLElement>("[data-meta]")?.style.left).toBe("80%");
      expect(li).toHaveTextContent("Meta 80 %");
    }
    // Criterio 1.4.11 de WCAG, al menos 3 a 1 entre el tramo, la línea de la meta y el fondo de la barra.
    expect(contraste(COLORES.enMeta, COLORES.fondo)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLORES.debajo, COLORES.fondo)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLORES.meta, COLORES.fondo)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLORES.meta, COLORES.enMeta)).toBeGreaterThanOrEqual(3);
    expect(contraste(COLORES.meta, COLORES.debajo)).toBeGreaterThanOrEqual(3);
  });

  // Spec 005, J-32. Hasta el 2026-11-24 este caso comprobaba el enlace al R-17 de «P6 ofrece el R-17 de cada sección
  // publicada» (spec 004). Desde la spec 005 la sección publicada ofrece «Ver la carga de la sección N de A», que abre P4,
  // el único lugar del R-17.
  it("ofrece Ver la carga solo de cada sección publicada, con el carga_id de su carga, y ningún enlace al R-17", async () => {
    const { alVerCarga } = await abrir(resultadosConUnaPublicada);
    const ver = await screen.findByRole("button", { name: "Ver la carga de la sección 412 de 450002" });
    expect(screen.getAllByRole("button", { name: /^Ver la carga de la/ })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Descargar R-17/ })).toBeNull();
    await userEvent.click(ver);
    expect(alVerCarga).toHaveBeenCalledWith(9);
  });

  it("una sección publicada sin carga_id válido no ofrece el R-17 y el resto del reporte sigue", async () => {
    const [publicada, ...resto] = resultadosConUnaPublicada.secciones;
    await abrir({ ...resultadosConUnaPublicada, secciones: [{ ...publicada, carga_id: null }, ...resto] });
    expect(await screen.findByText("Publicada")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Descargar R-17/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver la carga de la/ })).not.toBeInTheDocument();
  });

  it("no ofrece Subir export al profesor ni al coordinador", async () => {
    const { unmount } = await abrir(resultadosDeVarias);
    await screen.findByRole("region", { name: "SO 5" });
    expect(screen.queryByRole("button", { name: "Subir export" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Subir export" })).toBeNull();
    unmount();
    await abrir(resultadosDelCoordinador, usuarioCoordinador);
    await screen.findByRole("region", { name: "SO 5" });
    expect(screen.queryByText("Subir export")).toBeNull();
  });

  it("escribe lo que no se mide y no dibuja ninguna barra de 0 %", async () => {
    await abrir(resultadosSinMedir, usuarioProfesor);
    const secciones = await screen.findByRole("region", { name: "Secciones" });
    const sinCarga = within(secciones)
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes("Sección 410 de 450010"))!;
    expect(sinCarga).toHaveTextContent("Sin carga publicada");
    expect(sinCarga).toHaveTextContent("PI del plan: 2.1, 2.2, 5.1");
    expect(sinCarga.querySelector("[data-barra]")).toBeNull();
    expect(region("SO 2")).toHaveTextContent("Ninguna sección con carga publicada mide este SO.");
    expect(filas("SO 2")).toEqual([]);

    const sinCalificaciones = fila("SO 5", "5.3 · ");
    expect(sinCalificaciones.querySelector("p")).toHaveTextContent(/^5\.3 · Sección 410 de 450002 · Sin calificaciones \(11 sin evidencia\)$/);
    expect(sinCalificaciones.querySelector("[data-barra]")).toBeNull();
    expect(sinCalificaciones.textContent).not.toMatch(/0 %|0,0 %/);

    expect(filas("SO 5")).toContain(
      "5.2 · Sección 410 de 450002 · 60,0 % de los calificados (6 de 10) y 54,5 % del total (6 de 11), 1 sin evidencia · Debajo de la meta",
    );
  });

  it("escribe la falta de nivel esperado, de meta, de instrumento y de plan sin dibujar barras", async () => {
    const respuesta: Resultados = {
      periodo: "2026-2",
      so: [SO_5],
      secciones: [
        seccionConCarga(1, "450002", "Principios de Ingeniería Sostenible", "410", 7, [
          indicador(5, "5.1", [1, 3, 4, 3], 0, false, {
            nivel_esperado: null, logrados: null, pct_sobre_calificados: null, pct_sobre_total: null, en_meta: null,
          }),
          indicador(5, "5.2", [1, 3, 4, 3], 63.6, false, { meta_pct: null, en_meta: null, instrumento: null }),
        ]),
        seccionSinCargaDeLogros(4, "450010", "Gestión Sostenible de Residuos", "410", []),
      ],
    };
    await abrir(respuesta, usuarioProfesor);
    await screen.findByRole("region", { name: "SO 5" });
    expect(filas("SO 5")).toEqual([
      "5.1 · Sección 410 de 450002 · Sin nivel esperado definido",
      "5.2 · Sección 410 de 450002 · 63,6 % (7 de 11) · Sin meta definida",
    ]);
    expect(region("SO 5").querySelector('[data-barra="logro"]')).toBeNull();
    expect(within(fila("SO 5", "5.2 · ")).queryByText(/^Instrumento:/)).toBeNull();
    expect(region("Secciones")).toHaveTextContent("La carrera aún no registra el plan de medición de esta sección");
  });

  // US-63 de la spec 007, esquemas «Una lista vacía se explica según la cuenta» y «El aviso de espera de P6 habla de la
  // cuenta que lo lee».
  it.each([
    { usuario: usuarioProfesor, espera: "Cargando sus logros…", vacia: "No tiene secciones asignadas en este periodo.",
      otraEspera: "Cargando los logros de la carrera…", otraVacia: "La carrera no tiene secciones en este periodo." },
    { usuario: usuarioCoordinador, espera: "Cargando los logros de la carrera…", vacia: "La carrera no tiene secciones en este periodo.",
      otraEspera: "Cargando sus logros…", otraVacia: "No tiene secciones asignadas en este periodo." },
  ])("con el rol $usuario.rol espera con «$espera» y sin secciones dice «$vacia»", async ({ usuario, espera, vacia, otraEspera, otraVacia }) => {
    let soltar: (r: Respuesta) => void = () => undefined;
    simularApi({ "GET /api/resultados": () => new Promise<Respuesta>((resolver) => (soltar = resolver)) });
    render(<MisLogros usuario={usuario} alVolver={vi.fn()} />);
    expect(await screen.findByText(espera)).toBeInTheDocument();
    expect(screen.queryByText(otraEspera)).toBeNull();
    soltar(json(200, { periodo: "2026-2", so: [], secciones: [] }));
    expect(await screen.findByText(vacia)).toBeInTheDocument();
    expect(screen.queryByText(otraVacia)).toBeNull();
    expect(screen.queryByText(espera)).toBeNull();
  });

  it("dice que espera mientras la API responde, el error del servicio y la lista vacía", async () => {
    let soltar: (r: Respuesta) => void = () => undefined;
    simularApi({ "GET /api/resultados": () => new Promise<Respuesta>((resolver) => (soltar = resolver)) });
    const espera = render(<MisLogros usuario={usuarioProfesor} alVolver={vi.fn()} />);
    expect(await screen.findByText("Cargando sus logros…")).toBeInTheDocument();
    soltar(json(200, { periodo: "2026-2", so: [], secciones: [] }));
    expect(await screen.findByText("No tiene secciones asignadas en este periodo.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando sus logros…")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    espera.unmount();

    await abrir({ status: 502, texto: "<html>Bad Gateway</html>" }, usuarioProfesor);
    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio no respondió. Intente de nuevo.");
    expect(screen.queryByText("Cargando sus logros…")).toBeNull();
  });

  it.each([
    {
      provisional: true,
      conjunto: "R-2026-BORRADOR",
      estado: "BORRADOR",
      marca:
        "Resultados provisionales. Las reglas de la carrera (conjunto R-2026-BORRADOR) aún no están aprobadas. No usar como evidencia oficial.",
    },
    {
      provisional: true,
      conjunto: "R-PRUEBA-INCOMPLETO",
      estado: "APROBADO",
      marca:
        "Resultados provisionales. El conjunto de reglas R-PRUEBA-INCOMPLETO está aprobado, pero no define todos los parámetros que usan estos resultados. No usar como evidencia oficial.",
    },
    { provisional: false, conjunto: "R-PRUEBA-APROBADO", estado: "APROBADO", marca: null },
  ])(
    "escribe la marca provisional de una sección según su conjunto de reglas ($conjunto en $estado)",
    async ({ provisional, conjunto, estado, marca }) => {
      const seccion = { ...resultados410.secciones[0], provisional, conjunto_reglas: conjunto, conjunto_reglas_estado: estado };
      await abrir({ ...resultados410, secciones: [seccion] }, usuarioProfesor);
      const secciones = await screen.findByRole("region", { name: "Secciones" });
      if (marca === null) {
        expect(secciones).not.toHaveTextContent("Resultados provisionales");
      } else {
        expect(within(secciones).getByText(marca)).toBeInTheDocument();
      }
    },
  );

  it("no guarda nada en localStorage ni en sessionStorage", async () => {
    await abrir(resultadosDeVarias);
    await screen.findByRole("region", { name: "SO 5" });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("escribe el reparto por nivel de cada PI, con el conteo de cada tramo", async () => {
    await abrir(resultados410, usuarioProfesor);
    await screen.findByRole("region", { name: "SO 5" });
    const li = fila("SO 5", "5.3 · ");
    expect(within(li).getByText("Nivel 1: 1, Nivel 2: 2, Nivel 3: 5, Nivel 4: 3")).toBeInTheDocument();
    const barra = li.querySelector<HTMLElement>('[data-barra="niveles"]');
    expect(barra).toHaveAttribute("aria-hidden", "true");
    const tramos = Array.from(barra!.children) as HTMLElement[];
    expect(tramos.map((t) => t.textContent)).toEqual(["1", "2", "5", "3"]);
    expect(tramos.map((t) => Math.round(parseFloat(t.style.width) * 100) / 100)).toEqual([9.09, 18.18, 45.45, 27.27]);
    for (const color of COLORES.niveles) {
      expect(contraste(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el coordinador ve las secciones agrupadas por asignatura y en el orden de su número, nunca por su porcentaje", async () => {
    await abrir(resultadosDelCoordinador, usuarioCoordinador);
    expect(await screen.findByRole("heading", { level: 1, name: "Logros por SO de la carrera" })).toBeInTheDocument();
    const secciones = region("Secciones");
    expect(within(secciones).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "450002 Principios de Ingeniería Sostenible",
      "450010 Gestión Sostenible de Residuos",
    ]);
    const grupos = within(secciones).getAllByRole("list");
    expect(grupos).toHaveLength(2);
    const numeros = (lista: HTMLElement) =>
      within(lista)
        .getAllByRole("listitem")
        .map((li) => li.querySelector("p")?.textContent);
    expect(numeros(grupos[0])).toEqual(["Sección 410 de 450002", "Sección 411 de 450002", "Sección 412 de 450002"]);
    expect(numeros(grupos[1])).toEqual(["Sección 410 de 450010", "Sección 412 de 450010"]);
    // La 411 trae el 100 % y aun así va después de la 410, porque el orden es el de la API y no el del resultado.
    expect(filas("SO 5").slice(0, 4)).toEqual([
      "5.1 · Sección 410 de 450002 · 63,6 % (7 de 11) · Debajo de la meta",
      "5.2 · Sección 410 de 450002 · 63,6 % (7 de 11) · Debajo de la meta",
      "5.3 · Sección 410 de 450002 · 72,7 % (8 de 11) · Debajo de la meta",
      "5.1 · Sección 411 de 450002 · 100,0 % (11 de 11) · En la meta",
    ]);
    expect(document.body.textContent).not.toContain("@");
  });

  it("escribe el estado que decide la API, sin comparar el porcentaje con la meta", async () => {
    // Una respuesta inventada a propósito, con en_meta contrario a las cifras, para que P6 no pueda acertar comparando.
    const seccion = seccionConCarga(1, "450002", "Principios de Ingeniería Sostenible", "410", 7, [
      indicador(5, "5.1", [0, 0, 5, 6], 100.0, false),
      indicador(5, "5.2", [5, 6, 0, 0], 0.0, true, { logrados: 0 }),
    ]);
    await abrir({ periodo: "2026-2", so: [SO_5], secciones: [seccion] }, usuarioProfesor);
    await screen.findByRole("region", { name: "SO 5" });
    expect(filas("SO 5")).toEqual([
      "5.1 · Sección 410 de 450002 · 100,0 % (11 de 11) · Debajo de la meta",
      "5.2 · Sección 410 de 450002 · 0,0 % (0 de 11) · En la meta",
    ]);
  });

  it("vuelve a P2 con «Volver» y muestra el rótulo del piloto con el foco en el título", async () => {
    const { alVolver } = await abrir(resultados410, usuarioProfesor);
    expect(screen.getByRole("heading", { level: 1, name: "Mis logros por SO" })).toHaveFocus();
    expect(screen.queryByText("Solo exports con códigos inventados (99000000 a 99999999)")).not.toBeInTheDocument();
    await screen.findByRole("region", { name: "SO 5" });
    screen.getByRole("button", { name: "Volver" }).click();
    expect(alVolver).toHaveBeenCalledTimes(1);
  });
});
