import { useRef, useState, type FormEvent } from "react";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, subirExport, type OpcionesSubida } from "../servicios/api";
import { TITULO_ANTES_DE_SUBIR, lineasAntesDeSubir } from "../servicios/ayudas";
import { etiquetaSeccion, horaDeLima } from "../servicios/formato";
import type { Constancia, Seccion } from "../servicios/tipos";

interface Props {
  seccion: Seccion;
  alResultado: (constancia: Constancia) => void;
  alVerResultado: (cargaId: number) => void;
  alVolver: () => void;
  /** Corte 2. Modo reemplazo desde P5, con la carga publicada que la subida reemplaza. */
  reemplaza?: number;
}

/** Pregunta pendiente del corte 2, con las opciones de la subida que la provocó. */
type Pregunta =
  | { tipo: "reemplazo"; cargaPublicada: number; opciones: OpcionesSubida }
  | { tipo: "seccion"; detail: string; opciones: OpcionesSubida };

/** P3. La sección viene fija desde P2 o P5 y la API decide qué pasa con el archivo. */
export function SubirExport({ seccion, alResultado, alVerResultado, alVolver, reemplaza }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yaCargada, setYaCargada] = useState<{ constancia: Constancia; aviso: string | null } | null>(null);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function subir(opciones: OpcionesSubida) {
    if (enviando) return;
    setError(null);
    setYaCargada(null);
    setPregunta(null);
    if (!archivo) {
      setError("Elija el archivo del export (.xlsx, .csv o .xls).");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await subirExport(seccion.seccion_id, archivo, opciones);
      if (resultado.yaCargada) {
        // Solo un reemplazo usa el aviso del 200; fuera de él queda el mensaje del corte 1.
        const aviso = opciones.reemplaza === undefined ? null : resultado.aviso;
        setYaCargada({ constancia: resultado.constancia, aviso });
      } else alResultado(resultado.constancia);
    } catch (falla) {
      if (falla instanceof ErrorApi && falla.cargaPublicada !== null && opciones.reemplaza === undefined) {
        setPregunta({ tipo: "reemplazo", cargaPublicada: falla.cargaPublicada, opciones });
      } else if (falla instanceof ErrorApi && falla.requiereConfirmacion) {
        setPregunta({ tipo: "seccion", detail: falla.detail, opciones });
      } else {
        setError(falla instanceof ErrorApi ? falla.detail : "El servicio no respondió. Intente de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void subir(reemplaza === undefined ? {} : { reemplaza });
  }

  function aceptar(p: Pregunta) {
    void subir(
      p.tipo === "reemplazo"
        ? { ...p.opciones, reemplaza: p.cargaPublicada }
        : { ...p.opciones, confirmarSeccion: true },
    );
  }

  return (
    <>
      <Titulo>Subir export</Titulo>
      <p className="mb-4 font-medium">{etiquetaSeccion(seccion)}</p>
      {reemplaza !== undefined && (
        <>
          <p className="mb-1">Reemplaza a la carga {reemplaza}, la publicada de esta sección.</p>
          <p className="mb-4">Si la carga nueva queda rechazada, la carga {reemplaza} sigue publicada.</p>
        </>
      )}
      {/* Spec 007, US-60. Sale solo de Seccion.pi y de la constante de J-44, sin leer el archivo ni pedir nada. */}
      <section aria-labelledby="titulo-antes-de-subir" className="mb-4 rounded border border-slate-300 p-3">
        <h2 id="titulo-antes-de-subir" className="mb-2 text-lg font-semibold">
          {TITULO_ANTES_DE_SUBIR}
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lineasAntesDeSubir(seccion.pi).map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      </section>
      <form onSubmit={enviar} className="max-w-md space-y-4">
        <div>
          <label htmlFor="archivo" className="text-sm font-medium">Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)</label>
          {/* El control nativo pinta su botón en el idioma del navegador, así que queda oculto a la
              vista, con su etiqueta y su foco, y el botón visible es propio y en español. */}
          <input id="archivo" ref={campo} type="file" accept=".xlsx,.csv,.xls" className="peer sr-only"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setPregunta(null);
            }} />
          <div className="mt-1 flex flex-wrap items-center gap-3 rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-600">
            <button type="button" tabIndex={-1} aria-hidden="true" className={botonSecundario}
              onClick={() => campo.current?.click()}>
              Elegir archivo
            </button>
            <span className="text-sm">{archivo ? archivo.name : "Ningún archivo elegido"}</span>
          </div>
        </div>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        {yaCargada && (
          <Mensaje tipo="aviso">
            {yaCargada.aviso ?? (
              <>
                Este archivo ya se cargó el {horaDeLima(yaCargada.constancia.terminada_en)} y está publicado en la sección{" "}
                {yaCargada.constancia.seccion.numero}. No se cargó de nuevo.
              </>
            )}
          </Mensaje>
        )}
        {pregunta && (
          <div>
            <Mensaje tipo="aviso">
              {pregunta.tipo === "reemplazo"
                ? `La sección ${seccion.numero} ya tiene una carga publicada. ¿Desea reemplazarla?`
                : pregunta.detail}
            </Mensaje>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={enviando} className={boton} onClick={() => aceptar(pregunta)}>
                {pregunta.tipo === "reemplazo" ? "Sí, reemplazarla" : "Sí, es de esta sección"}
              </button>
              <button type="button" className={botonSecundario} onClick={() => setPregunta(null)}>
                No
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={enviando} className={boton}>
            {enviando ? "Subiendo" : "Subir"}
          </button>
          {yaCargada && (
            <button type="button" className={botonSecundario} onClick={() => alVerResultado(yaCargada.constancia.carga_id)}>
              Ver resultado
            </button>
          )}
          <button type="button" className={botonSecundario} onClick={alVolver}>
            Volver a mis secciones
          </button>
        </div>
      </form>
    </>
  );
}
