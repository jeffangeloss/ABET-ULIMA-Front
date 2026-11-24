import { useEffect, useId, useRef, useState } from "react";
import { Mensaje } from "./Mensaje";
import { boton, botonSecundario, campo, tarjeta } from "./estilos";
import { declarar, ErrorApi, guardarBorrador } from "../servicios/api";
import { horaCorta, horaDeLima } from "../servicios/formato";
import {
  contarCaracteres,
  MSG_GUARDANDO,
  MSG_NO_GUARDO,
  MSG_TOPE,
  NOTA_DATOS,
  NOTA_RECUADROS,
  ROTULOS,
  SIN_DECLARAR_COORDINADOR,
  TOPE_DE_CARACTERES,
} from "../servicios/mejora";
import type { Borrador, CuerpoBorrador, Declaracion, IndicadorDeCarga, IndicadoresCarga, Mejora } from "../servicios/tipos";

/** La causa y la acción que el profesor escribe en cada PI que lleva registro, por código de PI. */
export type Textos = Record<string, { causa: string; accion: string }>;

/** J-30. 2,5 s después de la última tecla, con un máximo de 15 s si se escribe sin pausa. */
const PAUSA_MS = 2500;
const MAXIMO_MS = 15_000;
const MSG_SIN_RESPUESTA = "El servicio no respondió. Intente de nuevo.";

type Guardado =
  | { tipo: "nada" }
  | { tipo: "guardando" }
  | { tipo: "guardado"; hora: string }
  | { tipo: "error" }
  | { tipo: "rechazo"; detalle: string }
  | { tipo: "conflicto"; detalle: string; borrador: Borrador }
  | { tipo: "reemplazada"; detalle: string; cargaNueva: number };

interface Props {
  cargaId: number;
  datos: IndicadoresCarga;
  mejora: Mejora;
  /** Sube cada vez que App vuelve a tener sesión, para reintentar el guardado que recibió un 401 (AD-22). */
  sesion?: number;
  /** US-54. Texto que P4 de la carga reemplazada trae con «Llevar el texto a la carga N», solo en memoria. */
  textosTraidos?: Textos;
  /** Avisa a App si hay texto sin guardar, para que un 401 deje P4 oculta bajo el ingreso en vez de desmontarla. */
  alCambiarPendiente?: (pendiente: boolean) => void;
  alDeclarar: (declaracion: Declaracion) => void;
  alVerCarga?: (cargaId: number, textos: Textos) => void;
}

const conRegistro = (datos: IndicadoresCarga) => datos.indicadores.filter((i) => i.tipo_registro !== null);

/** Los textos de partida, del texto traído, del borrador o de la declaración, en ese orden, y vacíos si no hay ninguno. */
function textosIniciales(datos: IndicadoresCarga, mejora: Mejora, traidos?: Textos): Textos {
  const textos: Textos = {};
  for (const i of conRegistro(datos)) {
    const deBorrador = mejora.borrador?.indicadores.find((r) => r.pi === i.pi);
    const deDeclaracion = mejora.declaracion?.indicadores.find((r) => r.pi === i.pi);
    const fuente = traidos?.[i.pi] ?? (mejora.borrador ? deBorrador : deDeclaracion);
    textos[i.pi] = { causa: fuente?.causa ?? "", accion: fuente?.accion ?? "" };
  }
  return textos;
}

function textosDelBorrador(datos: IndicadoresCarga, borrador: Borrador): Textos {
  return textosIniciales(datos, { declaracion: null, borrador, borrador_pendiente: false, heredado_de: null, puede_editar: true });
}

const excede = (textos: Textos) =>
  Object.values(textos).some((t) => contarCaracteres(t.causa) > TOPE_DE_CARACTERES || contarCaracteres(t.accion) > TOPE_DE_CARACTERES);

function Encabezado({ indicador, tipo, propuesta }: { indicador: IndicadorDeCarga; tipo: string | null; propuesta: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-titulo text-base font-semibold text-tinta">{tipo ? `${indicador.pi} · ${tipo}` : indicador.pi}</h3>
      {propuesta && (
        <span className="rounded-md border border-borde-campo bg-pendiente-fondo px-2 py-0.5 text-xs font-medium text-tinta">Propuesta</span>
      )}
    </div>
  );
}

/** El bloque de un PI sin campos, con lo declarado si lo hay, para el coordinador (US-47, escenario del coordinador). */
function BloqueDeLectura({ indicador, declaracion }: { indicador: IndicadorDeCarga; declaracion: Declaracion }) {
  const registro = declaracion.indicadores.find((r) => r.pi === indicador.pi);
  const rotulos = registro ? ROTULOS[registro.tipo] : null;
  return (
    <div data-pi={indicador.pi} className={`my-3 ${tarjeta}`}>
      <Encabezado indicador={indicador} tipo={rotulos?.tipo ?? null} propuesta={registro !== undefined} />
      <p className="mt-1 text-sm text-tinta-suave">{indicador.hallazgo}</p>
      {registro && rotulos && (
        <dl className="mt-3 space-y-2 text-sm text-tinta [&>dt]:font-medium [&>dt]:text-tinta-suave">
          <dt>{rotulos.causa}</dt>
          <dd className="whitespace-pre-line">{registro.causa}</dd>
          <dt>{rotulos.accion}</dt>
          <dd className="whitespace-pre-line">{registro.accion}</dd>
        </dl>
      )}
    </div>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  alCambiar,
  alSalir,
}: {
  id: string;
  rotulo: string;
  valor: string;
  alCambiar: (valor: string) => void;
  alSalir: () => void;
}) {
  const cuenta = contarCaracteres(valor);
  const demasiado = cuenta > TOPE_DE_CARACTERES;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {rotulo}
      </label>
      {/* Sin maxLength, porque el navegador cuenta unidades de UTF-16 y el Back cuenta puntos de código (J-39). */}
      <textarea
        id={id}
        rows={3}
        className={campo}
        value={valor}
        aria-invalid={demasiado}
        aria-describedby={`${id}-cuenta`}
        onChange={(e) => alCambiar(e.target.value)}
        onBlur={alSalir}
      />
      <p id={`${id}-cuenta`} className={`mt-1 text-xs ${demasiado ? "font-semibold text-error-texto" : "text-tinta-suave"}`}>
        {cuenta} de {TOPE_DE_CARACTERES} caracteres
      </p>
    </div>
  );
}

/**
 * Spec 005, US-47, US-48, US-53 y US-54. «Análisis por indicador» de P4, con un bloque por PI en el orden de la ruta 13.
 * El borrador se guarda solo en la base, con un PUT a la vez y una sola versión por carga, y nunca en el almacenamiento del
 * navegador. El tipo de cada registro es el tipo_registro de la ruta 13, que P4 copia sin calcularlo.
 */
export function AnalisisPorIndicador(props: Props) {
  const { datos, mejora } = props;
  if (!mejora.puede_editar) {
    return (
      <section aria-labelledby="titulo-analisis" className="my-5">
        <h2 id="titulo-analisis" className="mb-2 font-titulo text-seccion font-semibold text-tinta">
          Análisis por indicador
        </h2>
        {mejora.declaracion === null ? (
          <p className="text-sm text-tinta-suave">{SIN_DECLARAR_COORDINADOR}</p>
        ) : (
          <>
            <p className="text-sm text-tinta-suave">Declarado el {horaDeLima(mejora.declaracion.declarada_en)}</p>
            {datos.indicadores.map((i) => (
              <BloqueDeLectura key={i.pi} indicador={i} declaracion={mejora.declaracion!} />
            ))}
          </>
        )}
      </section>
    );
  }
  return <Edicion {...props} />;
}

function Edicion({ cargaId, datos, mejora, sesion, textosTraidos, alCambiarPendiente, alDeclarar, alVerCarga }: Props) {
  const base = useId();
  const [textos, setTextos] = useState<Textos>(() => textosIniciales(datos, mejora, textosTraidos));
  const [guardado, setGuardado] = useState<Guardado>({ tipo: "nada" });
  const [declaracion, setDeclaracion] = useState<Declaracion | null>(mejora.declaracion);
  const [declarando, setDeclarando] = useState(false);
  const [errorDeclaracion, setErrorDeclaracion] = useState<string | null>(null);

  const textosRef = useRef(textos);
  const versionRef = useRef(mejora.borrador?.version ?? 0);
  const sucioRef = useRef(false);
  const enVueloRef = useRef<Promise<boolean> | null>(null);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primerCambioRef = useRef<number | null>(null);
  /** Los registros que la API rechazó con 422, para no repetir el PUT mientras el texto no cambie (US-53). */
  const rechazadoRef = useRef<string | null>(null);
  /** Un 409 por versión o por reemplazo detiene el guardado automático hasta que la persona elige. */
  const detenidoRef = useRef(false);
  const esperaSesionRef = useRef(false);
  const avisarRef = useRef(alCambiarPendiente);
  avisarRef.current = alCambiarPendiente;

  const registros = conRegistro(datos);

  function armar(t: Textos): CuerpoBorrador {
    return {
      version: versionRef.current,
      indicadores: registros.map((i) => ({
        pi: i.pi,
        tipo: i.tipo_registro!,
        causa: t[i.pi].causa === "" ? null : t[i.pi].causa,
        accion: t[i.pi].accion === "" ? null : t[i.pi].accion,
      })),
    };
  }

  function limpiarTemporizador() {
    if (temporizadorRef.current !== null) clearTimeout(temporizadorRef.current);
    temporizadorRef.current = null;
  }

  function programar() {
    if (detenidoRef.current) return;
    const ahora = Date.now();
    primerCambioRef.current ??= ahora;
    limpiarTemporizador();
    const espera = Math.max(0, Math.min(PAUSA_MS, MAXIMO_MS - (ahora - primerCambioRef.current)));
    temporizadorRef.current = setTimeout(() => void guardarRef.current(), espera);
  }

  async function guardar(keepalive = false): Promise<boolean> {
    limpiarTemporizador();
    if (enVueloRef.current || detenidoRef.current) return false;
    const t = textosRef.current;
    if (excede(t)) {
      setGuardado({ tipo: "rechazo", detalle: MSG_TOPE });
      return false;
    }
    const cuerpo = armar(t);
    const clave = JSON.stringify(cuerpo.indicadores);
    if (clave === rechazadoRef.current) return false;
    sucioRef.current = false;
    primerCambioRef.current = null;
    setGuardado({ tipo: "guardando" });
    const promesa = (async () => {
      try {
        const r = await guardarBorrador(cargaId, cuerpo, { keepalive });
        versionRef.current = r.version;
        rechazadoRef.current = null;
        setGuardado({ tipo: "guardado", hora: horaCorta(r.actualizado_en ?? new Date().toISOString()) });
        if (sucioRef.current) programar();
        else avisarRef.current?.(false);
        return true;
      } catch (e) {
        sucioRef.current = true;
        if (!(e instanceof ErrorApi)) {
          setGuardado({ tipo: "error" });
        } else if (e.status === 401) {
          // App deja P4 oculta bajo el ingreso con el texto en memoria y sube «sesion» cuando vuelve el mismo usuario.
          esperaSesionRef.current = true;
          setGuardado({ tipo: "error" });
        } else if (e.status === 409 && e.reemplazadaPor !== null) {
          detenidoRef.current = true;
          setGuardado({ tipo: "reemplazada", detalle: e.detail, cargaNueva: e.reemplazadaPor });
        } else if (e.status === 409 && e.borrador !== null) {
          detenidoRef.current = true;
          setGuardado({ tipo: "conflicto", detalle: e.detail, borrador: e.borrador });
        } else if (e.status === 422 || e.status === 409) {
          rechazadoRef.current = clave;
          setGuardado({ tipo: "rechazo", detalle: e.detail });
        } else {
          setGuardado({ tipo: "error" });
        }
        return false;
      } finally {
        enVueloRef.current = null;
      }
    })();
    enVueloRef.current = promesa;
    return promesa;
  }
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  function cambiar(pi: string, que: "causa" | "accion", valor: string) {
    const nuevos = { ...textosRef.current, [pi]: { ...textosRef.current[pi], [que]: valor } };
    textosRef.current = nuevos;
    setTextos(nuevos);
    sucioRef.current = true;
    avisarRef.current?.(true);
    programar();
  }

  function salir() {
    if (sucioRef.current) void guardar();
  }

  // El texto traído de la carga reemplazada se guarda en esta carga sin esperar a que la persona escriba.
  const traidoRef = useRef(textosTraidos !== undefined);
  useEffect(() => {
    if (!traidoRef.current) return;
    traidoRef.current = false;
    sucioRef.current = true;
    avisarRef.current?.(true);
    void guardarRef.current();
  }, []);

  // AD-22. Con la sesión de vuelta, el guardado que recibió el 401 sale otra vez con la misma versión.
  useEffect(() => {
    if (!esperaSesionRef.current) return;
    esperaSesionRef.current = false;
    void guardarRef.current();
  }, [sesion]);

  // J-30. Al salir de la página, el borrador pendiente sale con keepalive.
  useEffect(() => {
    const alOcultar = () => {
      if (sucioRef.current) void guardarRef.current(true);
    };
    window.addEventListener("pagehide", alOcultar);
    return () => {
      window.removeEventListener("pagehide", alOcultar);
      // Dejar P4 descarta lo que no se guardó, como pide «Salir» (AD-22). Pulsar otro botón saca antes el foco del campo,
      // y esa salida ya envía el guardado.
      limpiarTemporizador();
      avisarRef.current?.(false);
    };
  }, []);

  function conservarPantalla(b: Borrador) {
    versionRef.current = b.version;
    detenidoRef.current = false;
    sucioRef.current = true;
    void guardar();
  }

  function usarGuardado(b: Borrador) {
    const nuevos = textosDelBorrador(datos, b);
    textosRef.current = nuevos;
    setTextos(nuevos);
    versionRef.current = b.version;
    detenidoRef.current = false;
    sucioRef.current = false;
    setGuardado({ tipo: "nada" });
    avisarRef.current?.(false);
  }

  async function guardarDeclaracion() {
    setErrorDeclaracion(null);
    setDeclarando(true);
    try {
      limpiarTemporizador();
      while (enVueloRef.current) await enVueloRef.current;
      // P4 envía siempre el guardado pendiente antes de declarar, y el arreglo vacío si ningún PI lleva registro.
      if (sucioRef.current || versionRef.current === 0) {
        const bien = await guardar();
        if (!bien) return;
      }
      const d = await declarar(cargaId, versionRef.current);
      setDeclaracion(d);
      alDeclarar(d);
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 409 && e.borrador !== null) {
        detenidoRef.current = true;
        setGuardado({ tipo: "conflicto", detalle: e.detail, borrador: e.borrador });
      } else {
        setErrorDeclaracion(e instanceof ErrorApi ? e.detail : MSG_SIN_RESPUESTA);
      }
    } finally {
      setDeclarando(false);
    }
  }

  const completo = registros.every((i) => textos[i.pi].causa.trim() !== "" && textos[i.pi].accion.trim() !== "");
  const declarados = new Set(declaracion?.indicadores.map((r) => r.pi) ?? []);

  return (
    <section aria-labelledby="titulo-analisis" className="my-5">
      <h2 id="titulo-analisis" className="mb-2 font-titulo text-seccion font-semibold text-tinta">
        Análisis por indicador
      </h2>
      <p className="max-w-prose text-sm text-tinta">{NOTA_RECUADROS}</p>
      <p className="my-2 max-w-prose text-sm font-semibold text-tinta">{NOTA_DATOS}</p>
      <div aria-live="polite" className="text-sm text-tinta-suave">
        {guardado.tipo === "guardando" && <p>{MSG_GUARDANDO}</p>}
        {guardado.tipo === "guardado" && <p>Borrador guardado a las {guardado.hora}</p>}
      </div>
      {guardado.tipo === "error" && <Mensaje tipo="error">{MSG_NO_GUARDO}</Mensaje>}
      {guardado.tipo === "rechazo" && <Mensaje tipo="error">{guardado.detalle}</Mensaje>}
      {guardado.tipo === "conflicto" && (
        <Mensaje tipo="aviso">
          <p>{guardado.detalle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={botonSecundario} onClick={() => conservarPantalla(guardado.borrador)}>
              Conservar el texto de esta pantalla
            </button>
            <button type="button" className={botonSecundario} onClick={() => usarGuardado(guardado.borrador)}>
              Usar el texto guardado
            </button>
          </div>
        </Mensaje>
      )}
      {guardado.tipo === "reemplazada" && (
        <Mensaje tipo="error">
          <p>{guardado.detalle}</p>
          {alVerCarga && (
            <button
              type="button"
              className={`mt-2 ${botonSecundario}`}
              onClick={() => alVerCarga(guardado.cargaNueva, textosRef.current)}
            >
              Llevar el texto a la carga {guardado.cargaNueva}
            </button>
          )}
        </Mensaje>
      )}
      {declaracion && <p className="my-2 text-sm font-medium text-tinta">Declarado el {horaDeLima(declaracion.declarada_en)}</p>}
      {datos.indicadores.map((i) => {
        const rotulos = i.tipo_registro ? ROTULOS[i.tipo_registro] : null;
        return (
          <div key={i.pi} data-pi={i.pi} className={`my-3 ${tarjeta}`}>
            <Encabezado indicador={i} tipo={rotulos?.tipo ?? null} propuesta={declarados.has(i.pi)} />
            <p className="mt-1 text-sm text-tinta-suave">{i.hallazgo}</p>
            {rotulos && (
              <>
                <Campo
                  id={`${base}-${i.pi}-causa`}
                  rotulo={rotulos.causa}
                  valor={textos[i.pi].causa}
                  alCambiar={(v) => cambiar(i.pi, "causa", v)}
                  alSalir={salir}
                />
                <Campo
                  id={`${base}-${i.pi}-accion`}
                  rotulo={rotulos.accion}
                  valor={textos[i.pi].accion}
                  alCambiar={(v) => cambiar(i.pi, "accion", v)}
                  alSalir={salir}
                />
              </>
            )}
          </div>
        );
      })}
      {errorDeclaracion && <Mensaje tipo="error">{errorDeclaracion}</Mensaje>}
      <button type="button" className={boton} disabled={!completo || excede(textos) || declarando} onClick={() => void guardarDeclaracion()}>
        Guardar declaración
      </button>
    </section>
  );
}
