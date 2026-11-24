// Escenarios @delegado_a_vitest de P4 de US-47, US-48, US-49, US-53 y US-54 en
// specs/005-oportunidades-de-mejora/aceptacion/declaracion.feature del Back. Cada «it» lleva el título exacto del
// escenario, y cada esquema suma entre paréntesis el valor de su fila de Ejemplos. El 401 durante el guardado y los
// enlaces de P2, P5 y P6 viven en tests/spec005/app.test.tsx, porque necesitan App.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultadoCarga } from "../../src/pantallas/ResultadoCarga";
import type { Constancia, CuerpoBorrador, IndicadoresCarga, Mejora, Rol } from "../../src/servicios/tipos";
import { json, simularApi, type Respuesta } from "../ayudas";
import { constanciaConError } from "../respuestas";
import {
  borradorDe,
  declaracionDe,
  indicadores410,
  indicadores410SinNotas53,
  indicadores412,
  mejoraVacia,
  textos410,
  textos412,
} from "../respuestas_mejora";

type Ruta = Respuesta | ((init: RequestInit | undefined) => Respuesta | Promise<Respuesta>);

const BP = { causa: "Causa del logro", accion: "Buena práctica que conviene mantener o compartir" };
const OM = { causa: "Causa probable", accion: "Acción de mejora" };
const GUARDADO = { version: 1, actualizado_en: "2026-11-21T15:10:00-05:00" };

interface Opciones {
  indicadores?: IndicadoresCarga;
  mejora?: Mejora;
  rol?: Rol;
  rutas?: Record<string, Ruta>;
  alVerCarga?: (cargaId: number, textos?: Record<string, { causa: string; accion: string }>) => void;
  textosTraidos?: Record<string, { causa: string; accion: string }>;
}

/** P4 de la carga de la 412 (carga 9) o de la 410 (carga 7), con las rutas 13 y 14 simuladas. */
function montar({ indicadores = indicadores412, mejora = mejoraVacia, rol = "PROFESOR", rutas = {}, alVerCarga, textosTraidos }: Opciones = {}) {
  const id = indicadores.carga_id;
  const constancia: Constancia = { ...constanciaConError, carga_id: id };
  const api = simularApi({
    [`GET /api/cargas/${id}/indicadores`]: json(200, indicadores),
    [`GET /api/cargas/${id}/mejora`]: json(200, mejora),
    ...rutas,
  });
  render(
    <ResultadoCarga cargaId={id} rol={rol} constanciaInicial={constancia} alVolver={vi.fn()} alVerCarga={alVerCarga} textosTraidos={textosTraidos} />,
  );
  return api;
}

const analisis = () => screen.findByRole("region", { name: "Análisis por indicador" });

/** El bloque de un PI, por su encabezado «5.2 · Oportunidad de mejora». */
function bloque(region: HTMLElement, pi: string) {
  const encabezado = within(region).getByRole("heading", { name: new RegExp(`^${pi.replace(".", "\\.")}( ·|$)`) });
  const el = encabezado.closest("[data-pi]");
  if (!(el instanceof HTMLElement)) throw new Error(`Sin el bloque de ${pi}`);
  return el;
}

function puts(llamadas: { clave: string; init: RequestInit | undefined }[]) {
  return llamadas.filter((l) => l.clave.startsWith("PUT ")).map((l) => JSON.parse(String(l.init!.body)) as CuerpoBorrador);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("US-47 · Registrar por indicador la oportunidad de mejora o la buena práctica en P4", () => {
  it.each([
    { respuesta: "con la declaración vigente y puede_editar falso" },
    { respuesta: "con solo un borrador, borrador nulo y puede_editar falso" },
  ])("P4 del coordinador muestra lo declarado sin campos ni botón ($respuesta)", async ({ respuesta }) => {
    const declarada = respuesta.startsWith("con la declaración");
    const mejora: Mejora = {
      ...mejoraVacia,
      declaracion: declarada ? declaracionDe(indicadores412, textos412) : null,
      borrador_pendiente: !declarada,
      puede_editar: false,
    };
    montar({ mejora, rol: "COORDINADOR" });
    const region = await analisis();
    expect(within(region).queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Guardar declaración" })).toBeNull();
    if (declarada) {
      for (const [pi, tipo] of [["5.1", "Buena práctica"], ["5.2", "Oportunidad de mejora"], ["5.3", "Buena práctica"]]) {
        const b = bloque(region, pi);
        expect(within(b).getByRole("heading")).toHaveTextContent(`${pi} · ${tipo}`);
        expect(within(b).getByText("Propuesta")).toBeInTheDocument();
        expect(b).toHaveTextContent(textos412[pi].causa);
        expect(b).toHaveTextContent(textos412[pi].accion);
      }
    } else {
      expect(within(region).getByText("El profesor todavía no declara el análisis por indicador.")).toBeInTheDocument();
      for (const t of Object.values(textos412)) expect(region).not.toHaveTextContent(t.causa);
      expect(within(region).queryByText("Propuesta")).toBeNull();
    }
  });

  it("P4 del profesor muestra un bloque por PI con los rótulos de su tipo", async () => {
    const declaracion = declaracionDe(indicadores412, textos412);
    const { llamadas } = montar({
      rutas: {
        "PUT /api/cargas/9/mejora/borrador": json(200, GUARDADO),
        "POST /api/cargas/9/mejora/declaracion": json(201, declaracion),
      },
    });
    const u = userEvent.setup();
    const region = await analisis();
    // Debajo de «Cómo va su sección».
    const comoVa = screen.getByRole("region", { name: "Cómo va su sección" });
    expect(comoVa.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const encabezados = within(region).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(encabezados).toEqual(["5.1 · Buena práctica", "5.2 · Oportunidad de mejora", "5.3 · Buena práctica"]);
    for (const ind of indicadores412.indicadores) {
      const b = bloque(region, ind.pi);
      // El hallazgo de la ruta 13 abre el bloque, copiado sin cambios.
      expect(within(b).getByText(ind.hallazgo)).toBeInTheDocument();
      const rotulos = ind.tipo_registro === "BUENA_PRACTICA" ? BP : OM;
      expect(within(b).getByLabelText(rotulos.causa)).toBeInTheDocument();
      expect(within(b).getByLabelText(rotulos.accion)).toBeInTheDocument();
      expect(within(b).getAllByRole("textbox")).toHaveLength(2);
    }
    expect(region).not.toHaveTextContent(/responsable|plazo/i);
    expect(screen.queryByLabelText(/Responsable|Plazo|Estado/)).toBeNull();
    expect(within(region).getByText("No escriba nombres, códigos ni correos de estudiantes.")).toBeInTheDocument();
    expect(within(region).getByText("Sus textos van a los recuadros A y B del R-17.")).toBeInTheDocument();

    const declarar = screen.getByRole("button", { name: "Guardar declaración" });
    expect(declarar).toBeDisabled();
    for (const [i, pi] of ["5.1", "5.2", "5.3"].entries()) {
      const [causa, accion] = within(bloque(region, pi)).getAllByRole("textbox");
      await u.type(causa, textos412[pi].causa);
      // Lo que no debe pasar: con un campo sin llenar el botón sigue deshabilitado.
      expect(declarar).toBeDisabled();
      await u.type(accion, textos412[pi].accion);
      if (i < 2) expect(declarar).toBeDisabled();
    }
    expect(declarar).toBeEnabled();
    await u.click(declarar);
    expect(await screen.findByText("Declarado el 21/11/2026 15:10")).toBeInTheDocument();
    for (const pi of ["5.1", "5.2", "5.3"]) {
      const b = bloque(region, pi);
      expect(within(b).getByText("Propuesta")).toBeInTheDocument();
      // Los bloques siguen disponibles para corregir.
      within(b).getAllByRole("textbox").forEach((t) => expect(t).toBeEnabled());
    }
    // Antes del POST sale el guardado con los seis textos, y el POST declara la versión que devolvió.
    const claves = llamadas.map((l) => l.clave);
    const ultimoPut = claves.lastIndexOf("PUT /api/cargas/9/mejora/borrador");
    expect(ultimoPut).toBeGreaterThan(-1);
    expect(claves.indexOf("POST /api/cargas/9/mejora/declaracion")).toBeGreaterThan(ultimoPut);
    const post = llamadas.find((l) => l.clave.startsWith("POST "))!;
    expect(JSON.parse(String(post.init!.body))).toEqual({ version: 1 });
    expect(puts(llamadas).at(-1)!.indicadores).toEqual(borradorDe(indicadores412, textos412).indicadores);
  });

  it("Un PI sin calificaciones muestra su hallazgo sin campos", async () => {
    const indicadores = { ...indicadores410SinNotas53, carga_id: 7 };
    montar({ indicadores });
    const region = await analisis();
    for (const pi of ["5.1", "5.2"]) {
      const b = bloque(region, pi);
      expect(within(b).getByRole("heading")).toHaveTextContent(`${pi} · Oportunidad de mejora`);
      expect(within(b).getAllByRole("textbox")).toHaveLength(2);
    }
    const b53 = bloque(region, "5.3");
    expect(within(b53).getByText("5.3: sin calificaciones en esta carga.")).toBeInTheDocument();
    expect(within(b53).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(b53).getByRole("heading")).toHaveTextContent(/^5\.3$/);
  });
});

describe("US-48 · El borrador se guarda solo y no se pierde", () => {
  it("El borrador vuelve al abrir P4", async () => {
    montar({ mejora: { ...mejoraVacia, borrador: borradorDe(indicadores412, textos412, 3), borrador_pendiente: true } });
    const region = await analisis();
    for (const pi of ["5.1", "5.2", "5.3"]) {
      const [causa, accion] = within(bloque(region, pi)).getAllByRole("textbox");
      expect(causa).toHaveValue(textos412[pi].causa);
      expect(accion).toHaveValue(textos412[pi].accion);
    }
    // Con los seis campos completos el botón se habilita sin escribir nada.
    expect(screen.getByRole("button", { name: "Guardar declaración" })).toBeEnabled();
  });

  it("El guardado automático sale 2,5 segundos después de escribir y al salir de un campo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let version = 0;
    const { llamadas } = montar({
      rutas: { "PUT /api/cargas/9/mejora/borrador": () => json(200, { version: ++version, actualizado_en: "2026-11-21T15:10:00-05:00" }) },
    });
    const region = await analisis();
    const [causa52] = within(bloque(region, "5.2")).getAllByRole("textbox");
    fireEvent.change(causa52, { target: { value: "La entrega coincidió con la semana de parciales." } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    // Lo que no debe pasar: antes de los 2,5 s no sale ningún PUT.
    expect(puts(llamadas)).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await waitFor(() => expect(puts(llamadas)).toHaveLength(1));
    const [primero] = puts(llamadas);
    expect(primero).toEqual({
      version: 0,
      indicadores: [
        { pi: "5.1", tipo: "BUENA_PRACTICA", causa: null, accion: null },
        { pi: "5.2", tipo: "OPORTUNIDAD_MEJORA", causa: "La entrega coincidió con la semana de parciales.", accion: null },
        { pi: "5.3", tipo: "BUENA_PRACTICA", causa: null, accion: null },
      ],
    });
    expect(await within(region).findByText("Borrador guardado a las 15:10")).toBeInTheDocument();

    const [, accion51] = within(bloque(region, "5.1")).getAllByRole("textbox");
    fireEvent.focus(accion51);
    fireEvent.change(accion51, { target: { value: "Mantener las revisiones semanales del avance." } });
    fireEvent.blur(accion51);
    await waitFor(() => expect(puts(llamadas)).toHaveLength(2));
    // Sale sin esperar los 2,5 s, con la versión que devolvió el primero.
    expect(puts(llamadas)[1].version).toBe(1);
    expect(puts(llamadas)[1].indicadores[0].accion).toBe("Mantener las revisiones semanales del avance.");
    // El temporizador del cambio ya no repite el mismo guardado.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(puts(llamadas)).toHaveLength(2);
  });

  it("escribir sin pausa guarda a los 15 s aunque la última tecla sea reciente", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { llamadas } = montar({ rutas: { "PUT /api/cargas/9/mejora/borrador": json(200, GUARDADO) } });
    const region = await analisis();
    const [causa] = within(bloque(region, "5.2")).getAllByRole("textbox");
    let texto = "";
    for (let s = 0; s < 14; s += 2) {
      texto += "ab";
      fireEvent.change(causa, { target: { value: texto } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    }
    expect(puts(llamadas)).toHaveLength(0);
    texto += "ab";
    fireEvent.change(causa, { target: { value: texto } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    await waitFor(() => expect(puts(llamadas)).toHaveLength(1));
  });

  it("Si el guardado falla, el texto sigue en pantalla", async () => {
    montar({
      indicadores: indicadores410,
      rutas: { "PUT /api/cargas/7/mejora/borrador": json(500, { detail: "Ocurrió un error interno. Intente de nuevo." }) },
    });
    const region = await analisis();
    const [causa51] = within(bloque(region, "5.1")).getAllByRole("textbox");
    fireEvent.change(causa51, { target: { value: textos410["5.1"].causa } });
    fireEvent.blur(causa51);
    expect(await within(region).findByText("No se pudo guardar el borrador. Su texto sigue en pantalla.")).toBeInTheDocument();
    expect(causa51).toHaveValue(textos410["5.1"].causa);
  });

  it("El navegador no guarda el texto", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar({ indicadores: indicadores410, rutas: { "PUT /api/cargas/7/mejora/borrador": json(200, GUARDADO) } });
    const region = await analisis();
    for (const pi of ["5.1", "5.2", "5.3"]) {
      const [causa, accion] = within(bloque(region, pi)).getAllByRole("textbox");
      fireEvent.change(causa, { target: { value: textos410[pi].causa } });
      fireEvent.change(accion, { target: { value: textos410[pi].accion } });
      fireEvent.blur(accion);
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("el 409 de otra pestaña ofrece elegir el texto de la pantalla o el guardado", async () => {
    const guardado = borradorDe(indicadores412, { "5.2": { causa: "Texto de la otra pestaña.", accion: "" } }, 3);
    let veces = 0;
    const { llamadas } = montar({
      rutas: {
        "PUT /api/cargas/9/mejora/borrador": () =>
          ++veces === 1 ? json(409, { detail: "Otra pestaña guardó un texto más reciente.", borrador: guardado }) : json(200, { version: 4, actualizado_en: null }),
      },
    });
    const u = userEvent.setup();
    const region = await analisis();
    const [causa52] = within(bloque(region, "5.2")).getAllByRole("textbox");
    fireEvent.change(causa52, { target: { value: "Texto de esta pestaña." } });
    fireEvent.blur(causa52);
    expect(await within(region).findByText("Otra pestaña guardó un texto más reciente.")).toBeInTheDocument();
    await u.click(within(region).getByRole("button", { name: "Usar el texto guardado" }));
    expect(causa52).toHaveValue("Texto de la otra pestaña.");
    expect(puts(llamadas)).toHaveLength(1);
    fireEvent.change(causa52, { target: { value: "Texto de esta pestaña otra vez." } });
    fireEvent.blur(causa52);
    // Después de elegir, el guardado sale con la versión del borrador guardado.
    await waitFor(() => expect(puts(llamadas)).toHaveLength(2));
    expect(puts(llamadas)[1].version).toBe(3);
  });
});

describe("US-49 · El R-17 solo con la declaración vigente completa", () => {
  it("P4 deshabilita el R-17 hasta que la carga tiene declaración", async () => {
    const declaracion = declaracionDe(indicadores410, textos410);
    montar({
      indicadores: indicadores410,
      mejora: { ...mejoraVacia, borrador: borradorDe(indicadores410, textos410, 2) },
      rutas: { "POST /api/cargas/7/mejora/declaracion": json(201, declaracion) },
    });
    const u = userEvent.setup();
    const boton = await screen.findByRole("button", { name: "Descargar R-17" });
    expect(boton).toBeDisabled();
    expect(screen.getByText("El R-17 se habilita cuando registre y declare la causa y la acción de cada indicador.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar R-17" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Guardar declaración" }));
    expect(await screen.findByRole("link", { name: "Descargar R-17" })).toHaveAttribute("href", "/api/cargas/7/r17.xlsx");
    expect(screen.queryByRole("button", { name: "Descargar R-17" })).toBeNull();
    expect(screen.queryByText(/El R-17 se habilita cuando/)).toBeNull();
  });

  it("P4 del coordinador sin declaración dice que espera al profesor", async () => {
    montar({ indicadores: indicadores410, mejora: { ...mejoraVacia, puede_editar: false }, rol: "COORDINADOR" });
    expect(await screen.findByRole("button", { name: "Descargar R-17" })).toBeDisabled();
    expect(screen.getByText("El R-17 se habilita cuando el profesor de la sección declare el análisis por indicador.")).toBeInTheDocument();
    expect(screen.queryByText("El R-17 se habilita cuando registre y declare la causa y la acción de cada indicador.")).toBeNull();
  });

  it("una carga con todos sus PI sin calificaciones guarda el arreglo vacío antes de declarar", async () => {
    const sinDato = indicadores410SinNotas53.indicadores[2];
    const indicadores: IndicadoresCarga = { ...indicadores410, indicadores: [{ ...sinDato, pi: "5.1", hallazgo: "5.1: sin calificaciones en esta carga." }, sinDato] };
    const { llamadas } = montar({
      indicadores,
      rutas: {
        "PUT /api/cargas/7/mejora/borrador": json(200, GUARDADO),
        "POST /api/cargas/7/mejora/declaracion": json(201, { declarada_en: "2026-11-21T15:10:00-05:00", indicadores: [] }),
      },
    });
    const u = userEvent.setup();
    await analisis();
    const declarar = screen.getByRole("button", { name: "Guardar declaración" });
    expect(declarar).toBeEnabled();
    await u.click(declarar);
    expect(await screen.findByRole("link", { name: "Descargar R-17" })).toBeInTheDocument();
    expect(puts(llamadas)).toEqual([{ version: 0, indicadores: [] }]);
    expect(JSON.parse(String(llamadas.find((l) => l.clave.startsWith("POST "))!.init!.body))).toEqual({ version: 1 });
  });

  it("el 422 de un análisis que no cabe en el R-17 se muestra junto al botón y conserva el texto", async () => {
    const detalle = "El análisis no cabe en el R-17. Acorte la causa o la acción de algún indicador.";
    montar({
      indicadores: indicadores410,
      mejora: { ...mejoraVacia, borrador: borradorDe(indicadores410, textos410, 2) },
      rutas: { "POST /api/cargas/7/mejora/declaracion": json(422, { detail: detalle }) },
    });
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Guardar declaración" }));
    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar R-17" })).toBeDisabled();
    const region = await analisis();
    expect(within(bloque(region, "5.1")).getAllByRole("textbox")[0]).toHaveValue(textos410["5.1"].causa);
  });

  it("un campo de más de 800 puntos de código no se guarda ni deja declarar", async () => {
    const { llamadas } = montar({ indicadores: indicadores410, mejora: { ...mejoraVacia, borrador: borradorDe(indicadores410, textos410, 2) } });
    const region = await analisis();
    const [causa] = within(bloque(region, "5.1")).getAllByRole("textbox");
    // 800 emojis son 800 puntos de código y 1600 unidades de UTF-16, así que caben.
    fireEvent.change(causa, { target: { value: "🌱".repeat(800) } });
    expect(within(bloque(region, "5.1")).getByText("800 de 800 caracteres")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar declaración" })).toBeEnabled();
    fireEvent.change(causa, { target: { value: "a".repeat(801) } });
    expect(within(bloque(region, "5.1")).getByText("801 de 800 caracteres")).toBeInTheDocument();
    expect(causa).toHaveAttribute("aria-invalid", "true");
    expect(causa).not.toHaveAttribute("maxlength");
    expect(screen.getByRole("button", { name: "Guardar declaración" })).toBeDisabled();
    fireEvent.blur(causa);
    expect(await within(region).findByText("Cada campo admite hasta 800 caracteres.")).toBeInTheDocument();
    expect(puts(llamadas)).toHaveLength(0);
  });
});

describe("US-53 · El análisis por indicador no lleva datos de estudiantes", () => {
  it("Un 422 durante el guardado automático deja el texto y no reintenta en bucle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const detalle = "La declaración no puede llevar códigos ni correos. Describa las causas y las acciones sin datos de estudiantes.";
    const { llamadas } = montar({ indicadores: indicadores410, rutas: { "PUT /api/cargas/7/mejora/borrador": json(422, { detail: detalle }) } });
    const region = await analisis();
    expect(within(region).getByText("No escriba nombres, códigos ni correos de estudiantes.")).toBeInTheDocument();
    const [causa51] = within(bloque(region, "5.1")).getAllByRole("textbox");
    fireEvent.change(causa51, { target: { value: "99000004 no entregó" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(await within(region).findByText(detalle)).toBeInTheDocument();
    expect(causa51).toHaveValue("99000004 no entregó");
    expect(puts(llamadas)).toHaveLength(1);
    // Ni el tiempo ni salir del campo repiten el PUT mientras el texto no cambie.
    fireEvent.blur(causa51);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(puts(llamadas)).toHaveLength(1);
    // Con un texto nuevo sí vuelve a guardar.
    fireEvent.change(causa51, { target: { value: "La entrega coincidió con la semana de parciales." } });
    fireEvent.blur(causa51);
    await waitFor(() => expect(puts(llamadas)).toHaveLength(2));
  });
});

describe("US-54 · El reemplazo trae el análisis anterior como borrador", () => {
  it("P4 de la carga reemplazada conserva el texto y lo lleva a la nueva", async () => {
    const alVerCarga = vi.fn();
    montar({
      indicadores: indicadores410,
      alVerCarga,
      rutas: {
        "PUT /api/cargas/7/mejora/borrador": json(409, {
          detail: "La carga no está publicada y no admite causas ni acciones.",
          reemplazada_por: 2,
        }),
      },
    });
    const u = userEvent.setup();
    const region = await analisis();
    const [causa51, accion51] = within(bloque(region, "5.1")).getAllByRole("textbox");
    fireEvent.change(causa51, { target: { value: textos410["5.1"].causa } });
    fireEvent.change(accion51, { target: { value: textos410["5.1"].accion } });
    fireEvent.blur(accion51);
    expect(await within(region).findByText("La carga no está publicada y no admite causas ni acciones.")).toBeInTheDocument();
    expect(causa51).toHaveValue(textos410["5.1"].causa);
    await u.click(within(region).getByRole("button", { name: "Llevar el texto a la carga 2" }));
    expect(alVerCarga).toHaveBeenCalledWith(2, {
      "5.1": textos410["5.1"],
      "5.2": { causa: "", accion: "" },
      "5.3": { causa: "", accion: "" },
    });
  });

  it("la carga nueva muestra el texto heredado con el rótulo de su tipo nuevo y lo guarda con el primer PUT", async () => {
    // La 410 declarada con tres OM y reemplazada por la copia con 5.3 en la meta, que la ruta 13 da como BP.
    const nueva: IndicadoresCarga = {
      ...indicadores410,
      carga_id: 12,
      indicadores: [
        indicadores410.indicadores[0],
        indicadores410.indicadores[1],
        { ...indicadores410.indicadores[2], semaforo: "VERDE", en_meta: true, tipo_registro: "BUENA_PRACTICA", hallazgo: "5.3: 80,0 % en Satisfactorio o más, meta 80,0 %" },
      ],
    };
    const heredado = { ...borradorDe(nueva, textos410, 0), actualizado_en: null };
    const { llamadas } = montar({
      indicadores: nueva,
      mejora: { ...mejoraVacia, borrador: heredado, heredado_de: 7 },
      rutas: {
        "PUT /api/cargas/12/mejora/borrador": json(200, GUARDADO),
        "POST /api/cargas/12/mejora/declaracion": json(201, declaracionDe(nueva, textos410)),
      },
    });
    const u = userEvent.setup();
    const region = await analisis();
    const b53 = bloque(region, "5.3");
    expect(within(b53).getByRole("heading")).toHaveTextContent("5.3 · Buena práctica");
    expect(within(b53).getByLabelText(BP.causa)).toHaveValue(textos410["5.3"].causa);
    expect(screen.getByRole("button", { name: "Descargar R-17" })).toBeDisabled();
    await u.click(screen.getByRole("button", { name: "Guardar declaración" }));
    await screen.findByRole("link", { name: "Descargar R-17" });
    expect(puts(llamadas)[0]).toEqual({ version: 0, indicadores: heredado.indicadores });
  });

  it("el texto traído de la carga reemplazada llena los bloques de la carga nueva y se guarda", async () => {
    const { llamadas } = montar({
      indicadores: { ...indicadores410, carga_id: 2 },
      textosTraidos: { "5.1": textos410["5.1"], "6.1": { causa: "De un PI que la carga nueva no mide.", accion: "x" } },
      rutas: { "PUT /api/cargas/2/mejora/borrador": json(200, GUARDADO) },
    });
    const region = await analisis();
    expect(within(bloque(region, "5.1")).getAllByRole("textbox")[0]).toHaveValue(textos410["5.1"].causa);
    await waitFor(() => expect(puts(llamadas)).toHaveLength(1));
    expect(puts(llamadas)[0].indicadores.map((i) => i.pi)).toEqual(["5.1", "5.2", "5.3"]);
    expect(puts(llamadas)[0].indicadores[0]).toMatchObject(textos410["5.1"]);
    expect(region).not.toHaveTextContent("De un PI que la carga nueva no mide.");
  });
});
