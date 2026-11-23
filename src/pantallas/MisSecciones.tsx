import { useEffect, useId, useState } from "react";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario, tarjeta } from "../componentes/estilos";
import { ErrorApi, listarSecciones, urlR17 } from "../servicios/api";
import { etiquetaSeccion } from "../servicios/formato";
import { rotuloDeSecciones, sinSecciones } from "../servicios/rotulos";
import { seccionesDelProfesor } from "../servicios/secciones_del_profesor";
import type { Seccion, Usuario } from "../servicios/tipos";

interface Props {
  usuario: Usuario;
  /** Spec 008, US-73. El periodo elegido en la cabecera, o ninguno para el vigente de la API. */
  periodo?: string;
  /** Spec 008, US-73. Verdadero cuando la cabecera ofrece el selector «Periodo». */
  conSelector?: boolean;
  alSubir: (seccion: Seccion) => void;
  alVerResultado: (cargaId: number) => void;
}

const SIN_PLAN = "La carrera aún no registra el plan de medición de esta sección";

/** Spec 007, US-59 y D-46. Lo que dice P2 al profesor sin secciones, bajo el texto de hoy. */
const A_QUIEN_ACUDIR = "Si dicta una sección con medición ABET en este periodo, escriba a la Coordinación de la carrera.";

/** Spec 008, US-73. Lo que dice P2 al profesor sin secciones cuando la cabecera ofrece otro periodo (propuesta). */
const OTRO_PERIODO = "Elija otro periodo en la cabecera si dictó una sección con medición ABET en otro ciclo.";

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

/** Spec 008, US-81. Marca escrita de cada paso del camino, para que el estado no dependa solo del color. */
type Marca = "Ahora" | "Hecho" | "Corregir" | "Pendiente";

const PASOS = ["Subir el export", "Revisar el resultado y descargar el R-17"] as const;

/**
 * Spec 008, US-81. El camino de la sección del profesor, en dos pasos (propuesta). Una sección sin plan no tiene
 * camino, porque no hay nada que hacer todavía, y la coordinación no lo recibe.
 */
function caminoDe(s: Seccion, conRechazo: boolean): readonly [Marca, Marca] | null {
  if (!s.tiene_plan) return null;
  if (s.estado === "PUBLICADA") return ["Hecho", "Ahora"];
  return [conRechazo ? "Corregir" : "Ahora", "Pendiente"];
}

const esActual = (m: Marca) => m === "Ahora" || m === "Corregir";

const punto: Record<Marca, string> = {
  Ahora: "border-ocre bg-ocre shadow-[inset_0_0_0_3px_var(--color-superficie)]",
  Hecho: "border-hecho-texto bg-hecho-texto",
  Corregir: "border-error-borde bg-corregir-fondo",
  Pendiente: "border-borde-campo bg-superficie",
};

const etiqueta: Record<Marca, string> = {
  Ahora: "bg-ahora-fondo text-ahora-texto",
  Hecho: "bg-hecho-fondo text-hecho-texto",
  Corregir: "bg-corregir-fondo text-corregir-texto",
  Pendiente: "bg-pendiente-fondo text-pendiente-texto",
};

/**
 * Los pasos no son elementos de lista, para que cada tarjeta siga siendo el único listitem de su sección (las pruebas
 * de la spec 007 cuentan las filas por ese rol). El lector de pantalla oye «Paso 1 de 2, ahora. Subir el export» una
 * sola vez, porque el número, el punto y la marca visibles quedan ocultos para él.
 */
function Camino({ marcas }: { marcas: readonly [Marca, Marca] }) {
  return (
    <div role="group" aria-label="Camino de la sección" className="mt-4 border-t border-linea pt-4">
      {PASOS.map((nombre, i) => {
        const marca = marcas[i];
        const actual = esActual(marca);
        const ultimo = i === PASOS.length - 1;
        return (
          <div
            key={nombre}
            data-paso
            aria-current={actual ? "step" : undefined}
            className={
              "relative flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 " +
              (ultimo ? "" : "pb-4 before:absolute before:top-6 before:bottom-1 before:left-[9px] before:w-0.5 before:bg-linea")
            }
          >
            <span className="sr-only">{`Paso ${i + 1} de ${PASOS.length}, ${marca.toLowerCase()}. ${nombre}`}</span>
            <span aria-hidden="true" className={`absolute top-0.5 left-0 size-5 rounded-full border-2 ${punto[marca]}`} />
            <span aria-hidden="true" className={actual ? "font-semibold text-tinta" : "text-tinta-suave"}>
              {`${i + 1}. ${nombre}`}
            </span>
            <span aria-hidden="true" data-marca className={`rounded-full px-2 py-0.5 text-xs font-semibold ${etiqueta[marca]}`}>
              {marca}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface Datos {
  secciones: Seccion[];
  rechazadas: ReadonlyMap<number, number>;
}

/**
 * P2. Una tarjeta por sección que la API entrega al usuario, con el estado de su carga y, al profesor, el camino de la
 * sección, lo que falta y el botón principal del paso actual (spec 008, US-81).
 */
export function MisSecciones({ usuario, periodo, conSelector = false, alSubir, alVerResultado }: Props) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefijo = useId();
  const esProfesor = usuario.rol === "PROFESOR";

  useEffect(() => {
    let vigente = true;
    // La coordinación no recibe las líneas del profesor, así que no pide la ruta 8 (FR-002 de la spec 007).
    const pedir = esProfesor
      ? seccionesDelProfesor(periodo)
      : listarSecciones(periodo).then((secciones) => ({ secciones, rechazadas: new Map<number, number>() }));
    pedir
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, [esProfesor, periodo]);

  const secciones = datos?.secciones ?? null;

  return (
    <>
      <Titulo>{rotuloDeSecciones(usuario)}</Titulo>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && secciones === null && <Espera>Cargando secciones</Espera>}
      {secciones !== null && secciones.length === 0 && (
        <div className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta">
          <p className="font-medium">{sinSecciones(usuario)}</p>
          {esProfesor && conSelector && <p className="mt-2 text-sm text-tinta-suave">{OTRO_PERIODO}</p>}
          {esProfesor && <p className="mt-2 text-sm text-tinta-suave">{A_QUIEN_ACUDIR}</p>}
        </div>
      )}
      {datos !== null && datos.secciones.length > 0 && (
        <ul className="space-y-4">
          {datos.secciones.map((s) => {
            const idSinPlan = `${prefijo}-sin-plan-${s.seccion_id}`;
            const idFalta = `${prefijo}-falta-${s.seccion_id}`;
            const rechazada = s.tiene_plan && s.estado === "SIN_CARGA" ? datos.rechazadas.get(s.seccion_id) : undefined;
            const camino = esProfesor ? caminoDe(s, rechazada !== undefined) : null;
            // El botón principal es el del paso actual. En el paso 2 lo es «Ver resultado» y «Subir export» queda al lado.
            const verPrimero = camino !== null && esActual(camino[1]) && s.carga_id !== null;
            const subir = esProfesor && (
              <button
                key="subir"
                type="button"
                className={verPrimero ? botonSecundario : boton}
                disabled={!s.tiene_plan}
                aria-describedby={s.tiene_plan ? idFalta : idSinPlan}
                onClick={() => alSubir(s)}
              >
                Subir export
              </button>
            );
            const ver = s.carga_id !== null && (
              <button
                key="ver"
                type="button"
                className={verPrimero ? boton : botonSecundario}
                onClick={() => alVerResultado(s.carga_id!)}
              >
                Ver resultado
              </button>
            );
            return (
              <li key={s.seccion_id} className={tarjeta}>
                <h2 className="font-titulo text-seccion font-semibold text-tinta">{etiquetaSeccion(s)}</h2>
                {s.tiene_plan ? (
                  <p className="mt-1 text-sm text-tinta-suave">PI del plan: {s.pi.join(", ")}</p>
                ) : (
                  <p id={idSinPlan} className="mt-1 text-sm text-tinta-suave">{SIN_PLAN}</p>
                )}
                <p className="text-sm text-tinta-suave">{estadoDeCarga(s)}</p>
                {camino && <Camino marcas={camino} />}
                {esProfesor && (
                  <p id={idFalta} className="mt-4 text-sm font-medium text-tinta">
                    {loQueFalta(s, rechazada !== undefined)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {verPrimero ? [ver, subir] : [subir, ver]}
                  {esProfesor && rechazada !== undefined && (
                    <button type="button" className={botonSecundario} onClick={() => alVerResultado(rechazada)}>
                      Ver por qué se rechazó
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
