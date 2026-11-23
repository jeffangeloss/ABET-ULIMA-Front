import { useEffect, useState } from "react";
import { AvisosCarga } from "../componentes/AvisosCarga";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { TablaRechazos } from "../componentes/TablaRechazos";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, obtenerCarga, urlR17 } from "../servicios/api";
import { consejosDeAvisos, queCorregir, REMISION_AL_REEMPLAZO } from "../servicios/ayudas";
import { horaDeLima, resumenFilas } from "../servicios/formato";
import type { Constancia, EstadoCarga, Rol } from "../servicios/tipos";

interface Props {
  cargaId: number;
  /** Rol de la sesión, para el consejo de SECCION_NO_COINCIDE del coordinador (spec 007, US-61). */
  rol: Rol;
  /** Constancia que P3 ya recibió con el 201, para no pedirla de nuevo. */
  constanciaInicial?: Constancia;
  alVolver: () => void;
  /** Spec 004. Abre P6 desde una carga PUBLICADA. */
  alVerLogros?: () => void;
  /** Texto del enlace a P6, el mismo de la cabecera. */
  rotuloLogros?: string;
}

const ETIQUETA_ESTADO: Record<EstadoCarga, string> = {
  PUBLICADA: "Publicada",
  RECHAZADA: "Rechazada",
  EN_CURSO: "En curso",
  REEMPLAZADA: "Reemplazada",
};

/** P4. Estado y conteos, rechazos, avisos aparte, constancia y descarga. Nunca un valor leído ni un nombre. */
export function ResultadoCarga({ cargaId, rol, constanciaInicial, alVolver, alVerLogros, rotuloLogros = "Ver mis logros por SO" }: Props) {
  const [constancia, setConstancia] = useState<Constancia | null>(constanciaInicial ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (constanciaInicial) return;
    let vigente = true;
    obtenerCarga(cargaId)
      .then((c) => vigente && setConstancia(c))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : "El servicio no respondió. Intente de nuevo."));
    return () => {
      vigente = false;
    };
  }, [cargaId, constanciaInicial]);

  // Spec 007, US-61, y spec 008, US-77. Una carga RECHAZADA o PUBLICADA con un motivo de la tabla de J-43 trae
  // consejo, y el de cada aviso va arriba, antes del estado y de la constancia.
  const consejo = constancia ? queCorregir(constancia, rol) : null;
  const consejosArriba = constancia ? consejosDeAvisos(constancia) : [];
  // J-53. Una carga PUBLICADA con algo que corregir remite al reemplazo de P5, sin botón en P4.
  const remitirAlReemplazo = constancia?.estado === "PUBLICADA" && (consejo !== null || consejosArriba.length > 0);

  return (
    <>
      <Titulo>Resultado de la carga</Titulo>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && !constancia && <Espera>Cargando la constancia</Espera>}
      {constancia && (
        <>
          {consejosArriba.map((texto) => (
            <Mensaje key={texto} tipo="aviso">
              {texto}
            </Mensaje>
          ))}
          <p>
            Estado de la carga: <strong>{ETIQUETA_ESTADO[constancia.estado]}</strong>
          </p>
          <p className="mt-1">{resumenFilas(constancia)}</p>
          {constancia.mensaje && <Mensaje tipo={constancia.estado === "PUBLICADA" ? "aviso" : "error"}>{constancia.mensaje}</Mensaje>}
          {consejo !== null && <p className="my-3 text-sm font-medium">{`Qué corregir. ${consejo}`}</p>}
          {remitirAlReemplazo && <p className="my-3 text-sm">{REMISION_AL_REEMPLAZO}</p>}
          <TablaRechazos rechazos={constancia.rechazos} />
          <AvisosCarga avisos={constancia.avisos} />
          <section aria-labelledby="titulo-constancia" className="my-4">
            <h2 id="titulo-constancia" className="mb-2 text-lg font-semibold">Constancia</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">Archivo</dt>
              <dd>{constancia.nombre_archivo}</dd>
              <dt className="font-medium">Hoja</dt>
              <dd>{constancia.hoja ?? "Sin hoja (export de texto)"}</dd>
              <dt className="font-medium">Huella SHA-256</dt>
              <dd className="break-all">{constancia.sha256}</dd>
              <dt className="font-medium">Conjunto de reglas</dt>
              <dd>{constancia.provisional ? `${constancia.conjunto_reglas} (PROVISIONAL)` : constancia.conjunto_reglas}</dd>
              <dt className="font-medium">Subida por</dt>
              <dd>{constancia.subida_por}</dd>
              <dt className="font-medium">Inicio</dt>
              <dd>{horaDeLima(constancia.iniciada_en)}</dd>
              <dt className="font-medium">Fin</dt>
              <dd>{horaDeLima(constancia.terminada_en)}</dd>
              {constancia.reemplaza_carga_id !== null && (
                <>
                  <dt className="font-medium">Reemplaza a la carga</dt>
                  <dd>{constancia.reemplaza_carga_id}</dd>
                </>
              )}
              {constancia.reemplazada_por !== null && (
                <>
                  <dt className="font-medium">Reemplazada por la carga</dt>
                  <dd>{constancia.reemplazada_por}</dd>
                </>
              )}
            </dl>
          </section>
          {constancia.estado === "PUBLICADA" ? (
            <a className={boton} href={urlR17(constancia.carga_id)}>
              Descargar R-17
            </a>
          ) : constancia.estado === "REEMPLAZADA" && constancia.reemplazada_por !== null ? (
            <p>La carga {constancia.reemplazada_por} la reemplaza, así que esta carga no tiene R-17.</p>
          ) : (
            // Spec 007, US-62. Tras un reemplazo rechazado la sección conserva su carga publicada, así que el texto
            // habla solo de esta carga.
            <p>Esta carga no tiene R-17.</p>
          )}
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={botonSecundario} onClick={alVolver}>
          Volver a mis secciones
        </button>
        {alVerLogros && constancia?.estado === "PUBLICADA" && (
          <button type="button" className={botonSecundario} onClick={alVerLogros}>
            {rotuloLogros}
          </button>
        )}
      </div>
    </>
  );
}
