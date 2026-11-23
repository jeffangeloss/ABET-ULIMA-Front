import { useEffect, useState } from "react";
import { Cargas } from "./pantallas/Cargas";
import { Ingreso } from "./pantallas/Ingreso";
import { MisLogros } from "./pantallas/MisLogros";
import { MisSecciones } from "./pantallas/MisSecciones";
import { ResultadoCarga } from "./pantallas/ResultadoCarga";
import { SubirExport } from "./pantallas/SubirExport";
import { botonSecundario } from "./componentes/estilos";
import { alSesionVencida, cerrarSesion, sesionActual } from "./servicios/api";
import { rotuloDeLogros, rotuloDeSecciones } from "./servicios/rotulos";
import type { Constancia, Seccion, Usuario } from "./servicios/tipos";

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

/** El botón de la pantalla actual se distingue también a la vista, no solo para el lector de pantalla. */
const botonDelMenu = `${botonSecundario} aria-[current=page]:border-slate-800 aria-[current=page]:bg-slate-200 aria-[current=page]:font-semibold`;

/** Sesión actual y pantalla visible. El resto del estado vive en la pantalla que lo usa. */
export function App() {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [vista, setVista] = useState<Vista>({ pantalla: "secciones" });
  const [aviso, setAviso] = useState<string | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    sesionActual()
      .then((u) => vigente && setUsuario(u))
      .catch(() => vigente && setUsuario(null));
    const quitar = alSesionVencida((detail) => {
      setAviso(detail);
      setUsuario(null);
      setVista({ pantalla: "secciones" });
    });
    return () => {
      vigente = false;
      quitar();
    };
  }, []);

  async function salir() {
    await cerrarSesion().catch(() => undefined);
    setAviso(undefined);
    setUsuario(null);
    setVista({ pantalla: "secciones" });
  }

  const volver = () => setVista({ pantalla: "secciones" });
  const verLogros = () => setVista({ pantalla: "logros" });

  return (
    <div className="mx-auto max-w-3xl p-4 text-slate-900">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2">
        <span className="font-semibold">ABET ULIMA, carga del R-17</span>
        {usuario && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <nav aria-label="Menú principal" className="flex flex-wrap items-center gap-3">
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
            <span>{usuario.correo}</span>
            <button type="button" className={botonSecundario} onClick={salir}>
              Salir
            </button>
          </div>
        )}
      </header>
      <main>
        {usuario === undefined && <p role="status">Cargando</p>}
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
        {usuario && vista.pantalla === "secciones" && (
          <MisSecciones
            usuario={usuario}
            alSubir={(seccion) => setVista({ pantalla: "subir", seccion })}
            alVerResultado={(cargaId) => setVista({ pantalla: "resultado", cargaId })}
          />
        )}
        {usuario && vista.pantalla === "cargas" && (
          <Cargas
            usuario={usuario}
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
        {usuario && vista.pantalla === "logros" && <MisLogros usuario={usuario} alVolver={volver} />}
      </main>
    </div>
  );
}
