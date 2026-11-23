import { useEffect, useState } from "react";
import { Cargas } from "./pantallas/Cargas";
import { Ingreso } from "./pantallas/Ingreso";
import { MisLogros } from "./pantallas/MisLogros";
import { MisSecciones } from "./pantallas/MisSecciones";
import { ResultadoCarga } from "./pantallas/ResultadoCarga";
import { SubirExport } from "./pantallas/SubirExport";
import { Espera } from "./componentes/Espera";
import { botonSecundario } from "./componentes/estilos";
import { alSesionVencida, cerrarSesion, listarPeriodos, sesionActual } from "./servicios/api";
import { rotuloDeLogros, rotuloDeSecciones } from "./servicios/rotulos";
import type { Constancia, Periodos, Seccion, Usuario } from "./servicios/tipos";

type Vista =
  | { pantalla: "secciones" }
  | { pantalla: "cargas" }
  | { pantalla: "subir"; seccion: Seccion; reemplaza?: number }
  | { pantalla: "resultado"; cargaId: number; constancia?: Constancia }
  | { pantalla: "logros" };

type Pantalla = Vista["pantalla"];

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
  const correo = usuario?.correo;

  useEffect(() => {
    let vigente = true;
    sesionActual()
      .then((u) => vigente && setUsuario(u))
      .catch(() => vigente && setUsuario(null));
    const quitar = alSesionVencida((detail) => {
      setAviso(detail);
      setUsuario(null);
      setEstadoPeriodo(null);
      setVista({ pantalla: "secciones" });
    });
    return () => {
      vigente = false;
      quitar();
    };
  }, []);

  // Spec 008, US-73. La ruta 18 se pide una vez por sesión, antes de P2. Si falla, P2 sigue como hoy y sin mensaje.
  useEffect(() => {
    if (!correo) return;
    let vigente = true;
    listarPeriodos()
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
    setEstadoPeriodo(null);
    setVista({ pantalla: "secciones" });
  }

  const volver = () => setVista({ pantalla: "secciones" });
  const verLogros = () => setVista({ pantalla: "logros" });
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
                <button type="button" className={botonDelMenu} aria-current={actual(vista.pantalla, "secciones")} onClick={volver}>
                  {rotuloDeSecciones(usuario)}
                </button>
                <button
                  type="button"
                  className={botonDelMenu}
                  aria-current={actual(vista.pantalla, "cargas")}
                  onClick={() => setVista({ pantalla: "cargas" })}
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
            <Ingreso
              aviso={aviso}
              alIngresar={(u) => {
                setAviso(undefined);
                setUsuario(u);
                setVista({ pantalla: "secciones" });
              }}
            />
          )}
          {usuario && periodoListo && vista.pantalla === "secciones" && (
            <MisSecciones
              key={llave}
              usuario={usuario}
              periodo={periodo}
              conSelector={conSelector}
              alSubir={(seccion) => setVista({ pantalla: "subir", seccion })}
              alVerResultado={(cargaId) => setVista({ pantalla: "resultado", cargaId })}
            />
          )}
          {usuario && periodoListo && vista.pantalla === "cargas" && (
            <Cargas
              key={llave}
              usuario={usuario}
              periodo={periodo}
              alVerResultado={(cargaId) => setVista({ pantalla: "resultado", cargaId })}
              alReemplazar={(seccion, cargaId) => setVista({ pantalla: "subir", seccion, reemplaza: cargaId })}
            />
          )}
          {usuario && vista.pantalla === "subir" && (
            <SubirExport
              key={`${vista.seccion.seccion_id}-${vista.reemplaza ?? "nueva"}`}
              seccion={vista.seccion}
              reemplaza={vista.reemplaza}
              alVolver={volver}
              alVerResultado={(cargaId) => setVista({ pantalla: "resultado", cargaId })}
              alResultado={(constancia) => setVista({ pantalla: "resultado", cargaId: constancia.carga_id, constancia })}
            />
          )}
          {usuario && vista.pantalla === "resultado" && (
            <ResultadoCarga
              cargaId={vista.cargaId}
              rol={usuario.rol}
              constanciaInicial={vista.constancia}
              alVolver={volver}
              alVerLogros={verLogros}
              rotuloLogros={rotuloDeLogros(usuario)}
            />
          )}
          {usuario && periodoListo && vista.pantalla === "logros" && (
            <MisLogros key={llave} usuario={usuario} periodo={periodo} alVolver={volver} />
          )}
        </main>
      </div>
    </div>
  );
}
