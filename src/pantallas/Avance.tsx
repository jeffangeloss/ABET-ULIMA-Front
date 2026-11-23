import { useEffect, useId, useState } from "react";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { botonSecundario, tarjeta } from "../componentes/estilos";
import { ErrorApi, obtenerAvance } from "../servicios/api";
import { rotuloDeAvance, sinSecciones } from "../servicios/rotulos";
import type { Avance as RespuestaAvance, Etapa, SeccionDeAvance, Usuario } from "../servicios/tipos";

interface Props {
  usuario: Usuario;
  /** Spec 008, US-73. El periodo elegido en la cabecera, o ninguno para el vigente de la API. */
  periodo?: string;
  /** Abre P4 de la carga publicada de una sección, el único lugar del R-17 (J-32 de la spec 005). */
  alVerCarga: (cargaId: number) => void;
}

/** Texto de cada etapa de J-48 (propuestas de US-65 de la spec 007). Una etapa que la API sume después se muestra tal cual. */
const TEXTO: Record<Etapa, string> = {
  PUBLICADA: "Publicada",
  CON_RECHAZO: "La última carga se rechazó",
  SIN_CARGA: "Sin carga",
  SIN_PROFESOR: "Sin profesor asignado",
  SIN_PLAN: "Sin plan de medición",
};

/**
 * Spec 008, US-81. Marca de color de cada etapa, oculta al lector de pantalla, porque el texto ya dice la etapa. Los
 * colores son los de los pares de componente de estilos.ts contra la superficie, y la sección sin plan lleva un punto
 * hueco para no confundirse con la que no tiene profesor.
 */
const MARCA: Record<Etapa, string> = {
  PUBLICADA: "border-hecho-texto bg-hecho-texto",
  CON_RECHAZO: "border-error-borde bg-error-borde",
  SIN_CARGA: "border-ocre bg-ocre",
  SIN_PROFESOR: "border-borde-campo bg-borde-campo",
  SIN_PLAN: "border-borde-campo bg-superficie",
};

/** «1 de 5 secciones con carga publicada.», con las cifras del conteo de la API (FR-009 de la spec 007). */
function resumen(conteo: RespuestaAvance["conteo"]): string {
  const secciones = conteo.secciones === 1 ? "sección" : "secciones";
  return `${conteo.PUBLICADA} de ${conteo.secciones} ${secciones} con carga publicada.`;
}

function lineaSinPlan(n: number): string {
  return n === 1
    ? "1 sección sin plan de medición, en la que su profesor no puede subir el export."
    : `${n} secciones sin plan de medición, en las que sus profesores no pueden subir el export.`;
}

/** Las secciones agrupadas por asignatura en el orden de la API, sin un orden por resultado (J-28 de la spec 004). */
function porAsignatura(secciones: SeccionDeAvance[]): SeccionDeAvance[][] {
  const grupos = new Map<string, SeccionDeAvance[]>();
  for (const s of secciones) {
    const grupo = grupos.get(s.asignatura.codigo);
    if (grupo) grupo.push(s);
    else grupos.set(s.asignatura.codigo, [s]);
  }
  return [...grupos.values()];
}

/**
 * P7 Avance del registro (US-65 de la spec 007 y US-79 de la spec 008). La etapa de cada sección al alcance de la
 * coordinación, con un resumen y un filtro que viven solo en el estado de React, sin el almacenamiento del navegador
 * (FR-012 de la spec 007). No muestra los correos del campo profesores, que esperan a D-47 y a D-51.
 */
export function Avance({ usuario, periodo, alVerCarga }: Props) {
  const [avance, setAvance] = useState<RespuestaAvance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soloFaltan, setSoloFaltan] = useState(false);
  const prefijo = useId();

  useEffect(() => {
    let vigente = true;
    obtenerAvance(periodo)
      .then((a) => vigente && setAvance(a))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  const visibles = avance ? avance.secciones.filter((s) => !soloFaltan || s.etapa !== "PUBLICADA") : [];

  return (
    <>
      <Titulo>{rotuloDeAvance(usuario)}</Titulo>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && avance === null && <Espera>Cargando el avance del registro</Espera>}
      {avance !== null && avance.secciones.length === 0 && (
        <div className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta">
          <p className="font-medium">{sinSecciones(usuario)}</p>
        </div>
      )}
      {avance !== null && avance.secciones.length > 0 && (
        <>
          <div className={tarjeta}>
            <p role="status" className="font-titulo text-seccion font-semibold text-tinta">
              {resumen(avance.conteo)}
            </p>
            {avance.conteo.SIN_PLAN > 0 && (
              <p className="mt-1 text-sm text-tinta-suave">{lineaSinPlan(avance.conteo.SIN_PLAN)}</p>
            )}
          </div>
          <label className="my-4 flex min-h-10 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-institucional focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
              checked={soloFaltan}
              onChange={(e) => setSoloFaltan(e.target.checked)}
            />
            Mostrar solo las secciones que faltan
          </label>
          {visibles.length === 0 && <p className="text-sm text-tinta-suave">No falta ninguna sección.</p>}
          <div className="space-y-4">
            {porAsignatura(visibles).map((grupo) => {
              const { codigo, nombre } = grupo[0].asignatura;
              const idTitulo = `${prefijo}-asignatura-${codigo}`;
              return (
                <section key={codigo} aria-labelledby={idTitulo} className={tarjeta}>
                  <h2 id={idTitulo} className="font-titulo text-seccion font-semibold text-tinta">
                    {`${codigo} ${nombre}`}
                  </h2>
                  <ul className="mt-2 divide-y divide-linea">
                    {grupo.map((s) => {
                      const idFila = `${prefijo}-seccion-${s.seccion_id}`;
                      return (
                        <li key={s.seccion_id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              data-etapa={s.etapa}
                              className={`size-3 shrink-0 rounded-full border-2 ${MARCA[s.etapa] ?? MARCA.SIN_PLAN}`}
                            />
                            <span id={idFila} className="font-medium text-tinta">
                              {`${s.numero} · ${TEXTO[s.etapa] ?? s.etapa}`}
                            </span>
                          </span>
                          {s.carga_id !== null && (
                            <button
                              type="button"
                              className={botonSecundario}
                              aria-describedby={idFila}
                              onClick={() => alVerCarga(s.carga_id!)}
                            >
                              Ver la carga
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
