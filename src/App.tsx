import { useEffect, useState } from "react";
import { Ingreso } from "./pantallas/Ingreso";
import { MisSecciones } from "./pantallas/MisSecciones";
import { ResultadoCarga } from "./pantallas/ResultadoCarga";
import { SubirExport } from "./pantallas/SubirExport";
import { botonSecundario } from "./componentes/estilos";
import { alSesionVencida, cerrarSesion, sesionActual } from "./servicios/api";
import type { Constancia, Seccion, Usuario } from "./servicios/tipos";

type Vista =
  | { pantalla: "secciones" }
  | { pantalla: "subir"; seccion: Seccion }
  | { pantalla: "resultado"; cargaId: number; constancia?: Constancia };

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

  return (
    <div className="mx-auto max-w-3xl p-4 text-slate-900">
      <header className="mb-6 flex items-center justify-between border-b border-slate-300 pb-2">
        <span className="font-semibold">ABET ULIMA, carga del R-17</span>
        {usuario && (
          <span className="flex items-center gap-3 text-sm">
            <span>{usuario.correo}</span>
            <button type="button" className={botonSecundario} onClick={salir}>
              Salir
            </button>
          </span>
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
        {usuario && vista.pantalla === "subir" && (
          <SubirExport
            seccion={vista.seccion}
            alVolver={volver}
            alVerResultado={(cargaId) => setVista({ pantalla: "resultado", cargaId })}
            alResultado={(constancia) => setVista({ pantalla: "resultado", cargaId: constancia.carga_id, constancia })}
          />
        )}
        {usuario && vista.pantalla === "resultado" && (
          <ResultadoCarga cargaId={vista.cargaId} constanciaInicial={vista.constancia} alVolver={volver} />
        )}
      </main>
    </div>
  );
}
