import { useEffect, useRef, useState } from "react";
import type { Textos } from "./componentes/AnalisisPorIndicador";
import { Avance } from "./pantallas/Avance";
import { Cargas } from "./pantallas/Cargas";
import { Ingreso } from "./pantallas/Ingreso";
import { MisLogros } from "./pantallas/MisLogros";
import { MisSecciones } from "./pantallas/MisSecciones";
import { ResultadoCarga } from "./pantallas/ResultadoCarga";
import { ResumenCurso } from "./pantallas/ResumenCurso";
import { SubirExport } from "./pantallas/SubirExport";
import { Espera } from "./componentes/Espera";
import { botonSecundario } from "./componentes/estilos";
import { alSesionVencida, cerrarSesion, listarPeriodos, sesionActual } from "./servicios/api";
import { ROTULO_RESUMEN, rotuloDeAvance, rotuloDeLogros, rotuloDeSecciones } from "./servicios/rotulos";
import type { Constancia, Periodos, Seccion, Usuario } from "./servicios/tipos";

type Vista =
  | { pantalla: "avance" }
  | { pantalla: "secciones" }
  | { pantalla: "cargas" }
  | { pantalla: "subir"; seccion: Seccion; reemplaza?: number }
  | {
      pantalla: "resultado";
      cargaId: number;
      constancia?: Constancia;
      /** Spec 005, US-54. El texto traído con «Llevar el texto a la carga N», solo en memoria. */
      textos?: Textos;
      /** Spec 005, US-52. La sección de la subida que terminó aquí, para «Subir otro archivo». */
      seccion?: Seccion;
    }
  | { pantalla: "logros" }
  /** Spec 009, US-92. P8, solo de la coordinación. La asignatura viene del enlace de P7 y va en el fragmento. */
  | { pantalla: "resumen"; asignatura?: string };

type Pantalla = Vista["pantalla"];

/**
 * Spec 005, US-52 y J-34. Cada pantalla vive en el fragmento de la dirección. history.state lleva solo la ruta y la marca
 * del ingreso, nunca la constancia ni el borrador, y cada pantalla vuelve a pedir sus datos.
 */
interface EstadoDelHistorial {
  ruta: string;
  ingreso: string;
}

const ID = "([1-9][0-9]{0,14})";
const RUTA_CARGA = new RegExp(`^#/cargas/${ID}$`);
const RUTA_SUBIR = new RegExp(`^#/secciones/${ID}/subir(?:\\?reemplaza=${ID})?$`);
const RUTA_RESUMEN = /^#\/resumen(?:\?asignatura=([0-9]{1,12}))?$/;
const RUTAS_FIJAS: Record<string, Vista> = {
  "#/avance": { pantalla: "avance" },
  "#/secciones": { pantalla: "secciones" },
  "#/cargas": { pantalla: "cargas" },
  "#/logros": { pantalla: "logros" },
};

/** El fragmento de cada pantalla (frontend.md, sección 10.3). */
export function fragmentoDe(v: Vista): string {
  switch (v.pantalla) {
    case "subir":
      return `#/secciones/${v.seccion.seccion_id}/subir${v.reemplaza === undefined ? "" : `?reemplaza=${v.reemplaza}`}`;
    case "resultado":
      return `#/cargas/${v.cargaId}`;
    case "resumen":
      return v.asignatura === undefined ? "#/resumen" : `#/resumen?asignatura=${v.asignatura}`;
    default:
      return `#/${v.pantalla}`;
  }
}

/**
 * La pantalla de un fragmento, o null si es desconocido. P3 necesita la sección, así que solo vuelve si esta sesión ya la
 * abrió, y P3 recargada cae a la pantalla de llegada. P7 y P8 son solo de la coordinación.
 */
function vistaDe(fragmento: string, usuario: Usuario, secciones: Map<number, Seccion>): Vista | null {
  const fija = RUTAS_FIJAS[fragmento];
  if (fija) return fija.pantalla === "avance" && usuario.rol !== "COORDINADOR" ? null : fija;
  const resumen = RUTA_RESUMEN.exec(fragmento);
  if (resumen) return usuario.rol === "COORDINADOR" ? { pantalla: "resumen", asignatura: resumen[1] } : null;
  const carga = RUTA_CARGA.exec(fragmento);
  if (carga) return { pantalla: "resultado", cargaId: Number(carga[1]) };
  const subir = RUTA_SUBIR.exec(fragmento);
  const seccion = subir ? secciones.get(Number(subir[1])) : undefined;
  if (subir && seccion) return { pantalla: "subir", seccion, reemplaza: subir[2] === undefined ? undefined : Number(subir[2]) };
  return null;
}

let marcas = 0;
/** Marca de un ingreso, que distingue las entradas del historial de esta sesión de las de otra. */
function nuevaMarca(): string {
  marcas += 1;
  return `${Date.now().toString(36)}-${marcas}`;
}

/**
 * J-46 de la spec 007. La pantalla a la que llega cada cuenta al ingresar, al abrir la aplicación con sesión y al volver
 * de un 401: P7 para el COORDINADOR, de la carrera o del curso, y P2 para el PROFESOR. US-52 de la spec 005 la reutiliza
 * para el fragmento vacío o desconocido cuando llegue la navegación por fragmento.
 */
export function pantallaDeLlegada(usuario: Usuario): Vista {
  return usuario.rol === "COORDINADOR" ? { pantalla: "avance" } : { pantalla: "secciones" };
}

/** Botón del menú que lleva aria-current en la pantalla a la vista. P3 y P4 no marcan ninguno (spec 007, US-63). */
function actual(vista: Pantalla, del: Pantalla): "page" | undefined {
  return vista === del ? "page" : undefined;
}

/**
 * El botón de la pantalla actual se distingue también a la vista, no solo para el lector de pantalla: queda sobre la
 * superficie blanca con la raya ocre que en P2 marca el paso actual (spec 008, US-81).
 */
const botonDelMenu =
  "inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco " +
  "aria-[current=page]:bg-superficie aria-[current=page]:font-semibold aria-[current=page]:text-institucional " +
  "aria-[current=page]:shadow-[inset_0_-3px_0_var(--color-ocre)]";

/**
 * Spec 008, US-73. Periodos de la ruta 18 para una sesión y el elegido en la cabecera. Vive solo en memoria, sin el
 * almacenamiento del navegador, y se pierde al salir o al recargar la página (contrato, sección 15.2).
 */
interface EstadoPeriodo {
  correo: string;
  periodos: string[];
  /** Ninguno cuando la ruta 18 falla o no trae periodos, y las rutas 4, 8 y 12 siguen sin periodo, como antes. */
  elegido: string | undefined;
}

/** Abre en el vigente si tiene secciones y, si no, en el más reciente con secciones (contrato, sección 15.2). */
function periodoInicial(p: Periodos): string | undefined {
  return p.periodos.includes(p.vigente) ? p.vigente : p.periodos[0];
}

/** Sesión actual, periodo elegido (spec 008) y pantalla visible. El resto del estado vive en la pantalla que lo usa. */
export function App() {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [vista, setVista] = useState<Vista>({ pantalla: "secciones" });
  const [aviso, setAviso] = useState<string | undefined>(undefined);
  const [estadoPeriodo, setEstadoPeriodo] = useState<EstadoPeriodo | null>(null);
  /** Spec 005, AD-22. El usuario cuya P4 queda oculta bajo el ingreso tras un 401, con su texto en memoria. */
  const [retenido, setRetenido] = useState<Usuario | null>(null);
  /** Sube cada vez que vuelve el mismo usuario, para que P4 reintente el guardado que recibió el 401. */
  const [sesion, setSesion] = useState(0);
  const correo = usuario?.correo;

  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;
  const vistaRef = useRef(vista);
  const ingresoRef = useRef("");
  const fragmentoRef = useRef("");
  const pendienteRef = useRef(false);
  const seccionesRef = useRef(new Map<number, Seccion>());

  /** Muestra una pantalla y la guarda en el fragmento, con una entrada nueva o en lugar de la actual. */
  function ir(v: Vista, reemplazar = false) {
    vistaRef.current = v;
    setVista(v);
    const ruta = fragmentoDe(v);
    const estado: EstadoDelHistorial = { ruta, ingreso: ingresoRef.current };
    if (reemplazar || window.location.hash === ruta) window.history.replaceState(estado, "", ruta);
    else window.history.pushState(estado, "", ruta);
    fragmentoRef.current = ruta;
  }

  /** Un ingreso nuevo, con su marca, en la pantalla del fragmento si la hay o en la de llegada. */
  function abrirSesion(u: Usuario, conFragmento: boolean) {
    ingresoRef.current = nuevaMarca();
    seccionesRef.current = new Map();
    const desdeFragmento = conFragmento ? vistaDe(window.location.hash, u, seccionesRef.current) : null;
    ir(desdeFragmento ?? pantallaDeLlegada(u), true);
  }

  useEffect(() => {
    let vigente = true;
    sesionActual()
      .then((u) => {
        if (!vigente) return;
        setUsuario(u);
        abrirSesion(u, true);
      })
      .catch(() => vigente && setUsuario(null));
    const quitar = alSesionVencida((detail) => {
      const actual = usuarioRef.current;
      setAviso(detail);
      setUsuario(null);
      setEstadoPeriodo(null);
      // AD-22. Con texto sin guardar en P4, la pantalla queda oculta bajo el ingreso en vez de desmontarse.
      if (actual && vistaRef.current.pantalla === "resultado" && pendienteRef.current) {
        setRetenido(actual);
      } else {
        vistaRef.current = { pantalla: "secciones" };
        setVista({ pantalla: "secciones" });
      }
    });
    // US-52. Atrás, adelante o un fragmento escrito en la dirección. Sin usuario, App muestra P1 con cualquier fragmento.
    const alCambiarDireccion = () => {
      const u = usuarioRef.current;
      const fragmento = window.location.hash;
      if (!u || fragmento === fragmentoRef.current) return;
      fragmentoRef.current = fragmento;
      const estado = window.history.state as Partial<EstadoDelHistorial> | null;
      const deOtroIngreso = typeof estado?.ingreso === "string" && estado.ingreso !== ingresoRef.current;
      const v = deOtroIngreso ? null : vistaDe(fragmento, u, seccionesRef.current);
      if (v) {
        vistaRef.current = v;
        setVista(v);
      } else {
        ir(pantallaDeLlegada(u), true);
      }
    };
    window.addEventListener("popstate", alCambiarDireccion);
    window.addEventListener("hashchange", alCambiarDireccion);
    return () => {
      vigente = false;
      quitar();
      window.removeEventListener("popstate", alCambiarDireccion);
      window.removeEventListener("hashchange", alCambiarDireccion);
    };
  }, []);

  // Spec 008, US-73. La ruta 18 se pide una vez por sesión, antes de P2. Si falla, P2 sigue como hoy y sin mensaje.
  // El catch maneja el rechazo de listarPeriodos y el último then no rechaza, así que void solo marca la cadena.
  useEffect(() => {
    if (!correo) return;
    let vigente = true;
    void listarPeriodos()
      .then((p): EstadoPeriodo => ({ correo, periodos: p.periodos, elegido: periodoInicial(p) }))
      .catch((): EstadoPeriodo => ({ correo, periodos: [], elegido: undefined }))
      .then((e) => vigente && setEstadoPeriodo(e));
    return () => {
      vigente = false;
    };
  }, [correo]);

  async function salir() {
    await cerrarSesion().catch(() => undefined);
    setAviso(undefined);
    setUsuario(null);
    setRetenido(null);
    setEstadoPeriodo(null);
    vistaRef.current = { pantalla: "secciones" };
    setVista({ pantalla: "secciones" });
    // US-52. Atrás desde P1 no muestra ninguna sección, porque las entradas anteriores son de otro ingreso.
    window.history.replaceState(null, "", "#/");
    fragmentoRef.current = "#/";
  }

  function alIngresar(u: Usuario) {
    setAviso(undefined);
    setUsuario(u);
    // AD-22. El mismo usuario recupera P4 con su texto y el guardado se reintenta. Otro usuario lo descarta.
    if (retenido && retenido.correo === u.correo) {
      setRetenido(null);
      setSesion((s) => s + 1);
      return;
    }
    setRetenido(null);
    abrirSesion(u, false);
  }

  const volver = () => ir({ pantalla: "secciones" });
  const verLogros = () => ir({ pantalla: "logros" });
  const verResumen = (asignatura?: string) => ir({ pantalla: "resumen", asignatura });
  const verCarga = (cargaId: number) => ir({ pantalla: "resultado", cargaId });
  const subir = (seccion: Seccion, reemplaza?: number) => {
    seccionesRef.current.set(seccion.seccion_id, seccion);
    ir({ pantalla: "subir", seccion, reemplaza });
  };
  /** Tras la subida, P4 toma la entrada de P3 solo si la pantalla visible sigue siendo esa subida. */
  const alSubirConResultado = (seccion: Seccion, reemplaza: number | undefined, constancia: Constancia) => {
    const v = vistaRef.current;
    if (v.pantalla !== "subir" || v.seccion.seccion_id !== seccion.seccion_id || v.reemplaza !== reemplaza) return;
    ir({ pantalla: "resultado", cargaId: constancia.carga_id, constancia, seccion }, true);
  };
  const quien = usuario ?? retenido;
  const periodoListo = usuario ? estadoPeriodo?.correo === usuario.correo : false;
  const periodos = periodoListo ? estadoPeriodo!.periodos : [];
  const periodo = periodoListo ? estadoPeriodo!.elegido : undefined;
  const conSelector = periodos.length >= 2;
  // Cambiar el periodo monta de nuevo P2, P5 y P6, que piden sus rutas con el periodo elegido.
  const llave = periodo ?? "vigente";

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <div aria-hidden="true" className="h-1 bg-institucional" />
      <div className="mx-auto max-w-3xl px-pagina pb-12">
        {/* La cuenta va junto al nombre del sistema y el menú con el periodo en la fila de abajo, como en un portal
            universitario. A 375 px cada grupo baja entero a su propia fila. */}
        <header className="mb-8 border-b border-linea py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="font-titulo text-lg font-semibold text-institucional">ABET ULIMA, carga del R-17</span>
            {usuario && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="break-all text-tinta-suave">{usuario.correo}</span>
                <button type="button" className={botonSecundario} onClick={salir}>
                  Salir
                </button>
              </div>
            )}
          </div>
          {usuario && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
              <nav aria-label="Menú principal" className="flex flex-wrap items-center gap-1">
                {usuario.rol === "COORDINADOR" && (
                  <button
                    type="button"
                    className={botonDelMenu}
                    aria-current={actual(vista.pantalla, "avance")}
                    onClick={() => ir({ pantalla: "avance" })}
                  >
                    {rotuloDeAvance(usuario)}
                  </button>
                )}
                {usuario.rol === "COORDINADOR" && (
                  <button
                    type="button"
                    className={botonDelMenu}
                    aria-current={actual(vista.pantalla, "resumen")}
                    onClick={() => verResumen()}
                  >
                    {ROTULO_RESUMEN}
                  </button>
                )}
                <button type="button" className={botonDelMenu} aria-current={actual(vista.pantalla, "secciones")} onClick={volver}>
                  {rotuloDeSecciones(usuario)}
                </button>
                <button
                  type="button"
                  className={botonDelMenu}
                  aria-current={actual(vista.pantalla, "cargas")}
                  onClick={() => ir({ pantalla: "cargas" })}
                >
                  Cargas
                </button>
                <button type="button" className={botonDelMenu} aria-current={actual(vista.pantalla, "logros")} onClick={verLogros}>
                  {rotuloDeLogros(usuario)}
                </button>
              </nav>
              {periodoListo && periodo !== undefined && !conSelector && (
                <span className="px-1 font-medium text-tinta">Periodo {periodo}</span>
              )}
              {periodoListo && conSelector && (
                <label className="flex items-center gap-2 font-medium">
                  Periodo
                  <select
                    className="min-h-10 rounded-md border border-borde-campo bg-superficie px-2 py-1 text-tinta focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco"
                    value={periodo}
                    onChange={(e) => setEstadoPeriodo({ ...estadoPeriodo!, elegido: e.target.value })}
                  >
                    {periodos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </header>
        <main>
          {(usuario === undefined || (usuario && !periodoListo)) && <Espera>Cargando</Espera>}
          {usuario === null && (
            <Ingreso aviso={aviso} alIngresar={alIngresar} />
          )}
          {usuario && periodoListo && vista.pantalla === "avance" && (
            <Avance
              key={llave}
              usuario={usuario}
              periodo={periodo}
              alVerCarga={verCarga}
              alVerResumen={verResumen}
            />
          )}
          {usuario && periodoListo && vista.pantalla === "resumen" && usuario.rol === "COORDINADOR" && (
            <ResumenCurso key={`${llave}-${vista.asignatura ?? ""}`} periodo={periodo} asignaturaInicial={vista.asignatura} alCambiarCurso={verResumen} />
          )}
          {usuario && periodoListo && vista.pantalla === "secciones" && (
            <MisSecciones
              key={llave}
              usuario={usuario}
              periodo={periodo}
              conSelector={conSelector}
              alSubir={(seccion) => subir(seccion)}
              alVerResultado={verCarga}
            />
          )}
          {usuario && periodoListo && vista.pantalla === "cargas" && (
            <Cargas
              key={llave}
              usuario={usuario}
              periodo={periodo}
              alVerResultado={verCarga}
              alReemplazar={(seccion, cargaId) => subir(seccion, cargaId)}
            />
          )}
          {usuario && vista.pantalla === "subir" && (
            <SubirExport
              key={`${vista.seccion.seccion_id}-${vista.reemplaza ?? "nueva"}`}
              seccion={vista.seccion}
              reemplaza={vista.reemplaza}
              alVolver={volver}
              alVerResultado={verCarga}
              alResultado={(constancia) => alSubirConResultado(vista.seccion, vista.reemplaza, constancia)}
            />
          )}
          {quien && vista.pantalla === "resultado" && (
            // AD-22. Tras un 401 con texto sin guardar, P4 sigue montada y oculta bajo el ingreso.
            <div hidden={!usuario}>
              <ResultadoCarga
                key={vista.cargaId}
                cargaId={vista.cargaId}
                rol={quien.rol}
                constanciaInicial={vista.constancia}
                textosTraidos={vista.textos}
                sesion={sesion}
                alCambiarPendiente={(p) => {
                  pendienteRef.current = p;
                }}
                alVolver={volver}
                alVerLogros={verLogros}
                rotuloLogros={rotuloDeLogros(quien)}
                alVerCarga={(cargaId, textos) => ir({ pantalla: "resultado", cargaId, textos })}
                alSubirOtro={vista.seccion ? () => subir(vista.seccion!) : undefined}
              />
            </div>
          )}
          {usuario && periodoListo && vista.pantalla === "logros" && (
            <MisLogros key={llave} usuario={usuario} periodo={periodo} alVolver={volver} alVerCarga={verCarga} />
          )}
        </main>
      </div>
    </div>
  );
}
