import { useEffect, useState } from "react";
import { AvisosCarga } from "../componentes/AvisosCarga";
import { EnlaceR17 } from "../componentes/EnlaceR17";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { TablaRechazos } from "../componentes/TablaRechazos";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario, tarjeta } from "../componentes/estilos";
import { ErrorApi, obtenerCarga } from "../servicios/api";
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

/** Spec 008, US-81. Filete del estado, que acompaña a la palabra escrita y nunca la reemplaza. */
const BORDE_DEL_ESTADO: Record<EstadoCarga, string> = {
  PUBLICADA: "border-l-hecho-texto",
  RECHAZADA: "border-l-error-borde",
  EN_CURSO: "border-l-institucional",
  REEMPLAZADA: "border-l-borde-campo",
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
          <div className={`my-3 border-l-4 ${BORDE_DEL_ESTADO[constancia.estado]} ${tarjeta}`}>
            <p className="font-titulo text-seccion text-tinta">
              Estado de la carga: <strong>{ETIQUETA_ESTADO[constancia.estado]}</strong>
            </p>
            <p className="mt-1 text-sm text-tinta-suave">{resumenFilas(constancia)}</p>
          </div>
          {constancia.mensaje && <Mensaje tipo={constancia.estado === "PUBLICADA" ? "aviso" : "error"}>{constancia.mensaje}</Mensaje>}
          {consejo !== null && <p className="my-3 max-w-prose text-sm font-semibold text-tinta">{`Qué corregir. ${consejo}`}</p>}
          {remitirAlReemplazo && <p className="my-3 max-w-prose text-sm text-tinta-suave">{REMISION_AL_REEMPLAZO}</p>}
          <TablaRechazos rechazos={constancia.rechazos} />
          <AvisosCarga avisos={constancia.avisos} />
          <section aria-labelledby="titulo-constancia" className={`my-5 ${tarjeta}`}>
            <h2 id="titulo-constancia" className="mb-3 font-titulo text-seccion font-semibold text-tinta">Constancia</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-tinta sm:grid-cols-[max-content_1fr] [&>dd]:mb-2 sm:[&>dd]:mb-0 [&>dt]:font-medium [&>dt]:text-tinta-suave">
              <dt>Archivo</dt>
              <dd>{constancia.nombre_archivo}</dd>
              <dt>Hoja</dt>
              <dd>{constancia.hoja ?? "Sin hoja (export de texto)"}</dd>
              <dt>Huella SHA-256</dt>
              <dd className="break-all">{constancia.sha256}</dd>
              <dt>Conjunto de reglas</dt>
              <dd>{constancia.provisional ? `${constancia.conjunto_reglas} (PROVISIONAL)` : constancia.conjunto_reglas}</dd>
              <dt>Subida por</dt>
              <dd>{constancia.subida_por}</dd>
              <dt>Inicio</dt>
              <dd>{horaDeLima(constancia.iniciada_en)}</dd>
              <dt>Fin</dt>
              <dd>{horaDeLima(constancia.terminada_en)}</dd>
              {constancia.reemplaza_carga_id !== null && (
                <>
                  <dt>Reemplaza a la carga</dt>
                  <dd>{constancia.reemplaza_carga_id}</dd>
                </>
              )}
              {constancia.reemplazada_por !== null && (
                <>
                  <dt>Reemplazada por la carga</dt>
                  <dd>{constancia.reemplazada_por}</dd>
                </>
              )}
            </dl>
          </section>
          {constancia.estado === "PUBLICADA" ? (
            <EnlaceR17 className={boton} cargaId={constancia.carga_id}>
              Descargar R-17
            </EnlaceR17>
          ) : constancia.estado === "REEMPLAZADA" && constancia.reemplazada_por !== null ? (
            <p className="text-tinta-suave">La carga {constancia.reemplazada_por} la reemplaza, así que esta carga no tiene R-17.</p>
          ) : (
            // Spec 007, US-62. Tras un reemplazo rechazado la sección conserva su carga publicada, así que el texto
            // habla solo de esta carga.
            <p className="text-tinta-suave">Esta carga no tiene R-17.</p>
          )}
        </>
      )}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-linea pt-4">
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
