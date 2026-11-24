import { useEffect, useState } from "react";
import { EnlaceR17 } from "../componentes/EnlaceR17";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { botonSecundario, tarjeta } from "../componentes/estilos";
import { ErrorApi, obtenerResultados } from "../servicios/api";
import { fraccion, meta, porcentaje } from "../servicios/formato";
import { esperaDeLogros, sinSecciones, tituloDeLogros } from "../servicios/rotulos";
import type { Indicador, Resultados, SeccionConLogros, Usuario } from "../servicios/tipos";

// P6 Mis logros por SO (spec 004 del Back, US-37 a US-44, docs/01-arquitectura/frontend.md, sección 9). Muestra las cifras
// de GET /api/resultados tal como llegan, sin recalcularlas ni compararlas, y nada que se guarde en el navegador.

const MSG_NO_RESPONDE = "El servicio no respondió. Intente de nuevo.";

/**
 * Colores de las barras, en hexadecimal para que las pruebas midan su contraste. El tramo lleno y la línea de la meta
 * contrastan al menos 3 a 1 con el fondo (criterio 1.4.11 de WCAG), y el texto blanco de cada tramo de los niveles,
 * al menos 4,5 a 1. Los niveles van en una escala azul y no en rojo y verde, porque el nivel que alcanza la meta lo
 * fija el conjunto de reglas. El estado nunca depende solo del color, porque cada fila lo escribe.
 */
export const COLORES = {
  fondo: "#e2e8f0",
  enMeta: "#047857",
  debajo: "#b45309",
  meta: "#0f172a",
  niveles: ["#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"],
} as const;

interface Props {
  usuario: Usuario;
  /** Spec 008, US-73. El periodo elegido en la cabecera, o ninguno para el vigente de la API. */
  periodo?: string;
  alVolver: () => void;
}

function nombreDeSeccion(s: SeccionConLogros): string {
  return `Sección ${s.numero} de ${s.asignatura.codigo}`;
}

/** Cifra del logro, con los dos porcentajes de D-05 cuando hay estudiantes sin evidencia. */
function cifraDelLogro(i: Indicador): string {
  const sobreCalificados = `${porcentaje(i.pct_sobre_calificados!)} (${fraccion(i.logrados!, i.calificados)})`;
  if (i.sin_evidencia === 0 || i.pct_sobre_total === null) return sobreCalificados;
  return (
    `${porcentaje(i.pct_sobre_calificados!)} de los calificados (${fraccion(i.logrados!, i.calificados)}) y ` +
    `${porcentaje(i.pct_sobre_total)} del total (${fraccion(i.logrados!, i.total)}), ${i.sin_evidencia} sin evidencia`
  );
}

/** «5.1 · Sección 412 de 450002 · 81,8 % (9 de 11) · En la meta», o lo que no se mide escrito con texto. */
function textoDeLaFila(i: Indicador, s: SeccionConLogros): string {
  const partes = [i.pi, nombreDeSeccion(s)];
  if (i.nivel_esperado === null) {
    partes.push("Sin nivel esperado definido");
  } else if (i.pct_sobre_calificados === null || i.logrados === null) {
    partes.push(`Sin calificaciones (${i.sin_evidencia} sin evidencia)`);
  } else {
    partes.push(cifraDelLogro(i));
    partes.push(i.en_meta === true ? "En la meta" : i.en_meta === false ? "Debajo de la meta" : "Sin meta definida");
  }
  return partes.join(" · ");
}

/** Texto de la franja provisional de la sección, como _franja del R-17, o null si no es provisional. */
function franjaProvisional(s: SeccionConLogros): string | null {
  if (s.provisional !== true) return null;
  if (s.conjunto_reglas_estado === "APROBADO") {
    return (
      `Resultados provisionales. El conjunto de reglas ${s.conjunto_reglas} está aprobado, pero no define todos los ` +
      "parámetros que usan estos resultados. No usar como evidencia oficial."
    );
  }
  return (
    `Resultados provisionales. Las reglas de la carrera (conjunto ${s.conjunto_reglas}) aún no están aprobadas. ` +
    "No usar como evidencia oficial."
  );
}

/**
 * Spec 008, US-78. Lo que dice la barra del logro a un lector de pantalla, con el porcentaje, la meta y el resultado
 * escritos, como «Logro 76,5 %, meta 80 %, debajo de la meta» (propuesta).
 */
function etiquetaDeLaBarra(i: Indicador): string {
  const resultado = i.en_meta ? "en la meta" : "debajo de la meta";
  return `Logro ${porcentaje(i.pct_sobre_calificados!)}, meta ${meta(i.meta_pct!)}, ${resultado}`;
}

/**
 * La barra del logro. El dibujo sigue con aria-hidden (US-41 de la spec 004) y el elemento que lo envuelve, con
 * role="img", le da al lector de pantalla su aria-label (US-78 de la spec 008).
 */
function BarraDelLogro({ indicador }: { indicador: Indicador }) {
  const logro = indicador.pct_sobre_calificados!;
  const laMeta = indicador.meta_pct!;
  return (
    <div className="mt-3">
      <div role="img" aria-label={etiquetaDeLaBarra(indicador)}>
        <div data-barra="logro" aria-hidden="true" className="relative h-3 w-full rounded" style={{ backgroundColor: COLORES.fondo }}>
          <div
            data-lleno
            className="h-3 rounded"
            style={{ width: `${logro}%`, backgroundColor: indicador.en_meta ? COLORES.enMeta : COLORES.debajo }}
          />
          <div data-meta className="absolute -top-1 h-5 w-0.5" style={{ left: `${laMeta}%`, backgroundColor: COLORES.meta }} />
        </div>
      </div>
      <p className="mt-1 text-xs text-tinta-suave">Meta {meta(laMeta)}</p>
    </div>
  );
}

function RepartoPorNivel({ indicador }: { indicador: Indicador }) {
  const conteos = indicador.estudiantes_por_nivel;
  const texto = conteos.map((n, i) => `Nivel ${i + 1}: ${n}`).join(", ");
  return (
    <div className="mt-3">
      <p className="text-xs text-tinta-suave">{texto}</p>
      <div data-barra="niveles" aria-hidden="true" className="mt-1 flex h-4 w-full gap-px overflow-hidden rounded bg-superficie text-[10px]">
        {conteos.map((n, i) =>
          n > 0 ? (
            <div
              key={i}
              className="flex items-center justify-center text-sobre-institucional"
              style={{ width: `${(n / indicador.calificados) * 100}%`, backgroundColor: COLORES.niveles[i] }}
            >
              {n}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

function FilaDeIndicador({ indicador, seccion }: { indicador: Indicador; seccion: SeccionConLogros }) {
  const conBarra = indicador.pct_sobre_calificados !== null && indicador.meta_pct !== null && indicador.en_meta !== null;
  return (
    <li className={tarjeta}>
      <p className="font-semibold text-tinta">{textoDeLaFila(indicador, seccion)}</p>
      {indicador.instrumento !== null && <p className="mt-1 text-sm text-tinta-suave">Instrumento: {indicador.instrumento}</p>}
      {conBarra && <BarraDelLogro indicador={indicador} />}
      {indicador.calificados > 0 && <RepartoPorNivel indicador={indicador} />}
    </li>
  );
}

function SeccionDelReporte({ seccion }: { seccion: SeccionConLogros }) {
  const franja = franjaProvisional(seccion);
  return (
    <li className={tarjeta}>
      <p className="font-titulo text-seccion font-semibold text-tinta">{nombreDeSeccion(seccion)}</p>
      {seccion.estado === "PUBLICADA" ? (
        <>
          <p className="mt-1 text-sm text-tinta-suave">Publicada</p>
          {franja && <p className="my-3 rounded-md border-l-4 border-aviso-borde bg-aviso-fondo px-3 py-2 text-sm text-aviso-texto">{franja}</p>}
          <EnlaceR17 className={botonSecundario} cargaId={seccion.carga_id}>
            Descargar R-17 de la {nombreDeSeccion(seccion).toLowerCase()}
          </EnlaceR17>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-tinta-suave">Sin carga publicada</p>
          {seccion.pi.length > 0 ? (
            <p className="text-sm text-tinta-suave">PI del plan: {seccion.pi.join(", ")}</p>
          ) : (
            <p className="text-sm text-tinta-suave">La carrera aún no registra el plan de medición de esta sección</p>
          )}
        </>
      )}
    </li>
  );
}

/** Secciones agrupadas por asignatura, en el orden de la API, que es el de su código y su número y nunca el del logro. */
function porAsignatura(secciones: SeccionConLogros[]): SeccionConLogros[][] {
  const grupos: SeccionConLogros[][] = [];
  for (const s of secciones) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[0].asignatura.codigo === s.asignatura.codigo) ultimo.push(s);
    else grupos.push([s]);
  }
  return grupos;
}

/** P6. Los logros de cada PI de las secciones del usuario, agrupados por SO y frente a la meta. */
export function MisLogros({ usuario, periodo, alVolver }: Props) {
  const [resultados, setResultados] = useState<Resultados | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerResultados(periodo)
      .then((r) => vigente && setResultados(r))
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.detail : MSG_NO_RESPONDE));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  const titulo = tituloDeLogros(usuario);
  const secciones = resultados?.secciones ?? [];

  return (
    <>
      <Titulo>{titulo}</Titulo>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!error && resultados === null && <Espera>{esperaDeLogros(usuario)}</Espera>}
      {resultados !== null && secciones.length === 0 && (
        <p className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta font-medium">
          {sinSecciones(usuario)}
        </p>
      )}
      {resultados !== null && secciones.length > 0 && (
        <>
          <p className="mb-6 max-w-prose text-sm text-tinta-suave">
            Periodo {resultados.periodo}. Cada fila compara un PI de una sección con la meta de la carrera, con las cifras del
            R-17 de su carga.
          </p>
          <section aria-labelledby="titulo-secciones" className="mb-6">
            <h2 id="titulo-secciones" className="mb-3 font-titulo text-seccion font-semibold text-tinta">
              Secciones
            </h2>
            {porAsignatura(secciones).map((grupo) => (
              <div key={grupo[0].asignatura.codigo} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-tinta-suave">
                  {grupo[0].asignatura.codigo} {grupo[0].asignatura.nombre}
                </h3>
                <ul className="space-y-3">
                  {grupo.map((s) => (
                    <SeccionDelReporte key={s.seccion_id} seccion={s} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
          {resultados.so.map((so) => {
            const filas = secciones.flatMap((s) =>
              s.indicadores.filter((i) => i.so === so.numero).map((i) => ({ seccion: s, indicador: i })),
            );
            return (
              <section
                key={so.numero}
                aria-labelledby={`titulo-so-${so.numero}`}
                className="mb-8 border-t border-linea pt-5"
              >
                <h2 id={`titulo-so-${so.numero}`} className="font-titulo text-seccion font-semibold text-tinta">
                  SO {so.numero}
                </h2>
                <p className="mt-1 mb-3 max-w-prose text-sm text-tinta-suave">{so.descripcion}</p>
                {filas.length === 0 ? (
                  <p className="text-sm text-tinta-suave">Ninguna sección con carga publicada mide este SO.</p>
                ) : (
                  <ul className="space-y-3">
                    {filas.map(({ seccion, indicador }) => (
                      <FilaDeIndicador key={`${seccion.seccion_id}-${indicador.pi}`} indicador={indicador} seccion={seccion} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </>
      )}
      <div className="mt-6">
        <button type="button" className={botonSecundario} onClick={alVolver}>
          Volver
        </button>
      </div>
    </>
  );
}
