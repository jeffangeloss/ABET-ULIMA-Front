import { useEffect, useState } from "react";
import { Mensaje } from "../componentes/Mensaje";
import { RotuloPiloto } from "../componentes/RotuloPiloto";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, listarCargas, listarSecciones, urlR17 } from "../servicios/api";
import { etiquetaSeccion, horaDeLima, resumenFilas } from "../servicios/formato";
import type { CargaResumida, EstadoCarga, Seccion, Usuario } from "../servicios/tipos";

interface Props {
  usuario: Usuario;
  alVerResultado: (cargaId: number) => void;
  alReemplazar: (seccion: Seccion, cargaId: number) => void;
}

const ETIQUETA_ESTADO: Record<EstadoCarga, string> = {
  PUBLICADA: "Publicada",
  RECHAZADA: "Rechazada",
  EN_CURSO: "En curso",
  REEMPLAZADA: "Reemplazada",
};

/** Marca de la carga vigente o de la reemplazada con su sucesora, o null si no lleva marca. */
function marca(c: CargaResumida): string | null {
  if (c.estado === "PUBLICADA") {
    return c.reemplaza_carga_id === null ? "Vigente" : `Vigente, reemplaza a la carga ${c.reemplaza_carga_id}`;
  }
  if (c.estado === "REEMPLAZADA" && c.reemplazada_por !== null) return `Reemplazada por la carga ${c.reemplazada_por}`;
  return null;
}

/**
 * P5 (US-18 y US-19). Cada sección al alcance del usuario con sus cargas en el orden de la API. Muestra solo
 * los campos que nombra la pantalla, así que nunca el motivo en código, un nombre, un valor leído ni una ruta.
 */
export function Cargas({ usuario, alVerResultado, alReemplazar }: Props) {
  const [datos, setDatos] = useState<{ secciones: Seccion[]; cargas: CargaResumida[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([listarSecciones(), listarCargas()])
      .then(([secciones, cargas]) => vigente && setDatos({ secciones, cargas }))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, []);

  // El profesor reemplaza en su sección y el coordinador en cualquiera; la API decide el alcance.
  const puedeReemplazar = usuario.rol === "PROFESOR" || usuario.rol === "COORDINADOR";

  return (
    <>
      <Titulo>Cargas</Titulo>
      <RotuloPiloto />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && datos === null && <Mensaje tipo="aviso">Cargando las cargas</Mensaje>}
      {!error && datos !== null && datos.secciones.length === 0 && <p>No tiene secciones asignadas en este periodo.</p>}
      {!error &&
        datos !== null &&
        datos.secciones.map((s) => {
          const cargas = datos.cargas.filter((c) => c.seccion.seccion_id === s.seccion_id);
          const idTitulo = `titulo-seccion-${s.seccion_id}`;
          return (
            <section key={s.seccion_id} aria-labelledby={idTitulo} className="mb-6">
              <h2 id={idTitulo} className="mb-2 text-lg font-semibold">
                {etiquetaSeccion(s)}
              </h2>
              {cargas.length === 0 ? (
                <p className="text-sm">Sin cargas</p>
              ) : (
                <ul className="space-y-3">
                  {cargas.map((c) => {
                    const m = marca(c);
                    return (
                      <li key={c.carga_id} className="rounded border border-slate-300 p-3 text-sm">
                        <p className="font-medium">Carga {c.carga_id}</p>
                        <p>
                          Estado: <strong>{ETIQUETA_ESTADO[c.estado]}</strong>
                        </p>
                        {m && <p className="font-medium">{m}</p>}
                        <p>{horaDeLima(c.iniciada_en)}</p>
                        <p>{resumenFilas(c)}</p>
                        <p>{c.nombre_archivo}</p>
                        <p>Huella {c.sha256_corto}</p>
                        {c.subida_por !== null && <p>Subida por {c.subida_por}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className={botonSecundario} onClick={() => alVerResultado(c.carga_id)}>
                            Ver constancia
                          </button>
                          {c.estado === "PUBLICADA" && (
                            <a className={botonSecundario} href={urlR17(c.carga_id)}>
                              Descargar R-17
                            </a>
                          )}
                          {c.estado === "PUBLICADA" && puedeReemplazar && (
                            <button type="button" className={boton} onClick={() => alReemplazar(s, c.carga_id)}>
                              Reemplazar carga
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
    </>
  );
}
