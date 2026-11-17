import { useEffect, useState } from "react";
import { Mensaje } from "../componentes/Mensaje";
import { RotuloPiloto } from "../componentes/RotuloPiloto";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, listarSecciones, urlR17 } from "../servicios/api";
import { etiquetaSeccion } from "../servicios/formato";
import type { Seccion, Usuario } from "../servicios/tipos";

interface Props {
  usuario: Usuario;
  alSubir: (seccion: Seccion) => void;
  alVerResultado: (cargaId: number) => void;
}

function estadoDeCarga(s: Seccion): string {
  return s.estado === "PUBLICADA"
    ? `Publicada, ${s.filas_aceptadas} de ${s.filas_leidas} filas aceptadas`
    : "Sin carga";
}

/** P2. Una fila por sección que la API entrega al usuario, con el estado de su carga. */
export function MisSecciones({ usuario, alSubir, alVerResultado }: Props) {
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    listarSecciones()
      .then((lista) => vigente && setSecciones(lista))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, []);

  const puedeSubir = usuario.rol === "PROFESOR";

  return (
    <>
      <Titulo>Mis secciones</Titulo>
      <RotuloPiloto />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && secciones === null && <Mensaje tipo="aviso">Cargando secciones</Mensaje>}
      {secciones !== null && secciones.length === 0 && <p>No tiene secciones asignadas en este periodo.</p>}
      {secciones !== null && secciones.length > 0 && (
        <ul className="space-y-3">
          {secciones.map((s) => (
            <li key={s.seccion_id} className="rounded border border-slate-300 p-3">
              <p className="font-medium">{etiquetaSeccion(s)}</p>
              {s.tiene_plan ? (
                <p className="text-sm">PI del plan: {s.pi.join(", ")}</p>
              ) : (
                <p className="text-sm">La carrera aún no registra el plan de medición de esta sección</p>
              )}
              <p className="text-sm">{estadoDeCarga(s)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {puedeSubir && (
                  <button type="button" className={boton} disabled={!s.tiene_plan} onClick={() => alSubir(s)}>
                    Subir export
                  </button>
                )}
                {s.carga_id !== null && (
                  <button type="button" className={botonSecundario} onClick={() => alVerResultado(s.carga_id!)}>
                    Ver resultado
                  </button>
                )}
                {!puedeSubir && s.carga_id !== null && (
                  <a className={botonSecundario} href={urlR17(s.carga_id)}>
                    Descargar R-17
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
