import { useRef, useState, type FormEvent } from "react";
import { Mensaje } from "../componentes/Mensaje";
import { RotuloPiloto } from "../componentes/RotuloPiloto";
import { Titulo } from "../componentes/Titulo";
import { boton, botonSecundario } from "../componentes/estilos";
import { ErrorApi, subirExport } from "../servicios/api";
import { etiquetaSeccion, horaDeLima } from "../servicios/formato";
import type { Constancia, Seccion } from "../servicios/tipos";

interface Props {
  seccion: Seccion;
  alResultado: (constancia: Constancia) => void;
  alVerResultado: (cargaId: number) => void;
  alVolver: () => void;
}

/** P3. La sección viene fija desde P2 y la API decide qué pasa con el archivo. */
export function SubirExport({ seccion, alResultado, alVerResultado, alVolver }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yaCargada, setYaCargada] = useState<Constancia | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    setYaCargada(null);
    if (!archivo) {
      setError("Elija el archivo .xlsx del export.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await subirExport(seccion.seccion_id, archivo);
      if (resultado.yaCargada) setYaCargada(resultado.constancia);
      else alResultado(resultado.constancia);
    } catch (falla) {
      setError(falla instanceof ErrorApi ? falla.detail : "El servicio no respondió. Intente de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Titulo>Subir export</Titulo>
      <RotuloPiloto />
      <p className="mb-4 font-medium">{etiquetaSeccion(seccion)}</p>
      <form onSubmit={enviar} className="max-w-md space-y-4">
        <div>
          <label htmlFor="archivo" className="text-sm font-medium">Export de Blackboard (.xlsx, hasta 1 MB)</label>
          {/* El control nativo pinta su botón en el idioma del navegador, así que queda oculto a la
              vista, con su etiqueta y su foco, y el botón visible es propio y en español. */}
          <input id="archivo" ref={campo} type="file" accept=".xlsx" className="peer sr-only"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
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
            Este archivo ya se cargó el {horaDeLima(yaCargada.terminada_en)} y está publicado en la sección{" "}
            {yaCargada.seccion.numero}. No se cargó de nuevo.
          </Mensaje>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={enviando} className={boton}>
            {enviando ? "Subiendo" : "Subir"}
          </button>
          {yaCargada && (
            <button type="button" className={botonSecundario} onClick={() => alVerResultado(yaCargada.carga_id)}>
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
