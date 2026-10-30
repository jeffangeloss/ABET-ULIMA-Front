import { useEffect, useState } from "react";
import { AvisosCarga } from "../componentes/AvisosCarga";
import { Mensaje } from "../componentes/Mensaje";
import { RotuloPiloto } from "../componentes/RotuloPiloto";
import { TablaRechazos } from "../componentes/TablaRechazos";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, obtenerCarga, urlR17 } from "../servicios/api";
import { horaDeLima } from "../servicios/formato";
import type { Constancia, EstadoCarga } from "../servicios/tipos";

interface Props {
  cargaId: number;
  /** Constancia que P3 ya recibió con el 201, para no pedirla de nuevo. */
  constanciaInicial?: Constancia;
  alVolver: () => void;
}

const ETIQUETA_ESTADO: Record<EstadoCarga, string> = {
  PUBLICADA: "Publicada",
  RECHAZADA: "Rechazada",
  EN_CURSO: "En curso",
  REEMPLAZADA: "Reemplazada",
};

function resumen(c: Constancia): string {
  const leidas = c.filas_leidas === 1 ? "1 fila leída" : `${c.filas_leidas} filas leídas`;
  const aceptadas = c.filas_aceptadas === 1 ? "1 aceptada" : `${c.filas_aceptadas} aceptadas`;
  const rechazadas = c.filas_rechazadas === 1 ? "1 rechazada" : `${c.filas_rechazadas} rechazadas`;
  return `${leidas}, ${aceptadas} y ${rechazadas}`;
}

/** P4. Estado y conteos, rechazos, avisos aparte, constancia y descarga. Nunca un valor leído ni un nombre. */
export function ResultadoCarga({ cargaId, constanciaInicial, alVolver }: Props) {
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

  return (
    <>
      <Titulo>Resultado de la carga</Titulo>
      <RotuloPiloto />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && !constancia && <Mensaje tipo="aviso">Cargando la constancia</Mensaje>}
      {constancia && (
        <>
          <p>
            Estado de la carga: <strong>{ETIQUETA_ESTADO[constancia.estado]}</strong>
          </p>
          <p className="mt-1">{resumen(constancia)}</p>
          {constancia.mensaje && <Mensaje tipo={constancia.estado === "PUBLICADA" ? "aviso" : "error"}>{constancia.mensaje}</Mensaje>}
          <TablaRechazos rechazos={constancia.rechazos} />
          <AvisosCarga avisos={constancia.avisos} />
          <section aria-labelledby="titulo-constancia" className="my-4">
            <h2 id="titulo-constancia" className="mb-2 text-lg font-semibold">Constancia</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">Archivo</dt>
              <dd>{constancia.nombre_archivo}</dd>
              <dt className="font-medium">Hoja</dt>
              <dd>{constancia.hoja}</dd>
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
            </dl>
          </section>
          {constancia.estado === "PUBLICADA" ? (
            <a className={boton} href={urlR17(constancia.carga_id)}>
              Descargar R-17
            </a>
          ) : (
            <p>No hay una carga publicada para esta sección</p>
          )}
        </>
      )}
      <div className="mt-4">
        <button type="button" className={botonSecundario} onClick={alVolver}>
          Volver a mis secciones
        </button>
      </div>
    </>
  );
}
