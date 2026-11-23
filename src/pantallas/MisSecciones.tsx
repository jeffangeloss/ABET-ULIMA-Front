import { useEffect, useId, useState } from "react";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, listarSecciones, urlR17 } from "../servicios/api";
import { etiquetaSeccion } from "../servicios/formato";
import { rotuloDeSecciones, sinSecciones } from "../servicios/rotulos";
import { seccionesDelProfesor } from "../servicios/secciones_del_profesor";
import type { Seccion, Usuario } from "../servicios/tipos";

interface Props {
  usuario: Usuario;
  alSubir: (seccion: Seccion) => void;
  alVerResultado: (cargaId: number) => void;
}

const SIN_PLAN = "La carrera aún no registra el plan de medición de esta sección";

/** Spec 007, US-59 y D-46. Lo que dice P2 al profesor sin secciones, bajo el texto de hoy. */
const A_QUIEN_ACUDIR = "Si dicta una sección con medición ABET en este periodo, escriba a la Coordinación de la carrera.";

function estadoDeCarga(s: Seccion): string {
  return s.estado === "PUBLICADA"
    ? `Publicada, ${s.filas_aceptadas} de ${s.filas_leidas} filas aceptadas`
    : "Sin carga";
}

/** Spec 007, US-59. La línea de lo que falta en la sección del profesor, según la ruta 4 y su carga rechazada. */
function loQueFalta(s: Seccion, conRechazo: boolean): string {
  if (!s.tiene_plan) return "Por ahora no hay nada que hacer. La Coordinación de la carrera registra el plan de medición.";
  if (s.estado === "PUBLICADA") return "Revise el resultado de la carga para completar lo que falte y descargar el R-17.";
  if (conRechazo) return "La última carga se rechazó y no se publicó. Falta subir un export corregido.";
  return "Falta subir el export de Blackboard de esta sección.";
}

interface Datos {
  secciones: Seccion[];
  rechazadas: ReadonlyMap<number, number>;
}

/** P2. Una fila por sección que la API entrega al usuario, con el estado de su carga y, al profesor, lo que falta. */
export function MisSecciones({ usuario, alSubir, alVerResultado }: Props) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefijo = useId();
  const esProfesor = usuario.rol === "PROFESOR";

  useEffect(() => {
    let vigente = true;
    // La coordinación no recibe las líneas del profesor, así que no pide la ruta 8 (FR-002 de la spec 007).
    const pedir = esProfesor
      ? seccionesDelProfesor()
      : listarSecciones().then((secciones) => ({ secciones, rechazadas: new Map<number, number>() }));
    pedir
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, [esProfesor]);

  const secciones = datos?.secciones ?? null;

  return (
    <>
      <Titulo>{rotuloDeSecciones(usuario)}</Titulo>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && secciones === null && <Mensaje tipo="aviso">Cargando secciones</Mensaje>}
      {secciones !== null && secciones.length === 0 && (
        <>
          <p>{sinSecciones(usuario)}</p>
          {esProfesor && <p className="mt-2 text-sm">{A_QUIEN_ACUDIR}</p>}
        </>
      )}
      {datos !== null && datos.secciones.length > 0 && (
        <ul className="space-y-3">
          {datos.secciones.map((s) => {
            const idSinPlan = `${prefijo}-sin-plan-${s.seccion_id}`;
            const idFalta = `${prefijo}-falta-${s.seccion_id}`;
            const rechazada = s.tiene_plan && s.estado === "SIN_CARGA" ? datos.rechazadas.get(s.seccion_id) : undefined;
            return (
              <li key={s.seccion_id} className="rounded border border-slate-300 p-3">
                <p className="font-medium">{etiquetaSeccion(s)}</p>
                {s.tiene_plan ? (
                  <p className="text-sm">PI del plan: {s.pi.join(", ")}</p>
                ) : (
                  <p id={idSinPlan} className="text-sm">{SIN_PLAN}</p>
                )}
                <p className="text-sm">{estadoDeCarga(s)}</p>
                {esProfesor && (
                  <p id={idFalta} className="mt-1 text-sm font-medium">
                    {loQueFalta(s, rechazada !== undefined)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {esProfesor && (
                    <button
                      type="button"
                      className={boton}
                      disabled={!s.tiene_plan}
                      aria-describedby={s.tiene_plan ? idFalta : idSinPlan}
                      onClick={() => alSubir(s)}
                    >
                      Subir export
                    </button>
                  )}
                  {esProfesor && rechazada !== undefined && (
                    <button type="button" className={botonSecundario} onClick={() => alVerResultado(rechazada)}>
                      Ver por qué se rechazó
                    </button>
                  )}
                  {s.carga_id !== null && (
                    <button type="button" className={botonSecundario} onClick={() => alVerResultado(s.carga_id!)}>
                      Ver resultado
                    </button>
                  )}
                  {!esProfesor && s.carga_id !== null && (
                    <a className={botonSecundario} href={urlR17(s.carga_id)}>
                      Descargar R-17
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
