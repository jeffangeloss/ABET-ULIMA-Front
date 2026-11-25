import { useEffect, useId, useState } from "react";
import { Espera } from "../componentes/Espera";
import { Mensaje } from "../componentes/Mensaje";
import { Titulo } from "../componentes/Titulo";
import { tarjeta } from "../componentes/estilos";
import { ErrorApi, listarCursosDelResumen, obtenerResumenCurso } from "../servicios/api";
import { complementoDelPorcentaje, fraccion, meta, porcentaje, promedio } from "../servicios/formato";
import { ROTULO_RESUMEN } from "../servicios/rotulos";
import type {
  CifrasDelCurso,
  CursosDelResumen,
  IndicadorDelResumen,
  ResumenCurso as RespuestaResumen,
  SeccionDelResumen,
} from "../servicios/tipos";
import { COLORES } from "./MisLogros";

// P8 Resumen del curso (spec 009 del Back, US-92 y US-93, BR-RESULTADOS-15). Escribe las cifras de GET /api/resumen-curso
// tal como llegan, sin recalcularlas, y dibuja las barras con HTML y Tailwind, sin biblioteca de gráficos (J-24). No
// muestra profesores ni ordena por resultado (BR-RESULTADOS-10 y D-57) y no guarda nada en el navegador.

const MSG_NO_RESPONDE = "El servicio no respondió. Intente de nuevo.";

/**
 * Colores de la barra de dos tramos del curso. Los dos contrastan al menos 3 a 1 con el fondo (criterio 1.4.11 de WCAG), y
 * son azul y gris, no verde y ámbar, porque el verde y el ámbar de P6 dicen si una sección cumple la meta y este tramo
 * cuenta alumnos por nivel. Lo que cada tramo mide lo escribe la leyenda, así que el color no lleva el significado solo.
 */
export const TRAMOS = { esperado: "#1e3a8a", debajo: "#64748b" } as const;

interface Props {
  /** El periodo elegido en la cabecera. Sin él, la ruta 20 no se puede pedir y la pantalla lo dice. */
  periodo?: string;
  /** El curso que trae el enlace de P7. Con él, la ruta 20 no espera a la lista de la ruta 21. */
  asignaturaInicial?: string;
}

function mensajeDe(e: unknown): string {
  return e instanceof ErrorApi ? e.detail : MSG_NO_RESPONDE;
}

function alumnos(n: number): string {
  return n === 1 ? "1 alumno" : `${n} alumnos`;
}

/** «Debajo de la meta, meta 80 %», o que la meta no está definida, que es el caso de un curso con metas distintas. */
function estadoDelCurso(c: CifrasDelCurso, metaPct: number | null): string {
  if (c.en_meta === null || metaPct === null) return "Sin meta definida";
  return `${c.en_meta ? "En la meta" : "Debajo de la meta"}, meta ${meta(metaPct)}`;
}

function estadoDeLaSeccion(enMeta: boolean | null): string {
  if (enMeta === null) return "Sin meta definida";
  return enMeta ? "En la meta" : "Debajo de la meta";
}

function Franja() {
  return (
    <p className="my-3 rounded-md border-l-4 border-aviso-borde bg-aviso-fondo px-3 py-2 text-sm text-aviso-texto">
      Cifras provisionales. Las reglas de la carrera aún no están aprobadas o no definen todos los parámetros que usan estas
      cifras. No usar como evidencia oficial.
    </p>
  );
}

function LineaDeMeta({ metaPct }: { metaPct: number | null }) {
  if (metaPct === null) return null;
  return <div data-meta className="absolute -top-1 h-6 w-0.5" style={{ left: `${metaPct}%`, backgroundColor: COLORES.meta }} />;
}

/** La barra de dos tramos del curso. El dibujo se oculta al lector de pantalla y la leyenda escribe cada cifra. */
function BarraDelCurso({ curso, metaPct }: { curso: CifrasDelCurso; metaPct: number | null }) {
  const logro = curso.pct_sobre_calificados!;
  const resto = complementoDelPorcentaje(logro);
  const debajo = curso.calificados - curso.logrados;
  return (
    <div className="mt-4">
      <div data-barra="curso" aria-hidden="true" className="relative flex h-4 w-full rounded bg-superficie">
        <div data-tramo="esperado" className="h-4 rounded-l" style={{ width: `${logro}%`, backgroundColor: TRAMOS.esperado }} />
        <div
          data-tramo="debajo"
          className="h-4 rounded-r border-l-2 border-superficie"
          style={{ width: `${resto}%`, backgroundColor: TRAMOS.debajo }}
        />
        <LineaDeMeta metaPct={metaPct} />
      </div>
      <ul className="mt-2 space-y-1 text-sm text-tinta-suave">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: TRAMOS.esperado }} />
          {`Nivel esperado o superior, ${alumnos(curso.logrados)}, ${porcentaje(logro)}`}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: TRAMOS.debajo }} />
          {`Debajo del nivel esperado, ${alumnos(debajo)}, ${porcentaje(resto)}`}
        </li>
      </ul>
    </div>
  );
}

/** Las cifras del curso, o con texto lo que no se mide. Nunca dibuja una barra de 0 % para un nulo (SC-004 de la spec 004). */
function CifrasDelCursoBloque({ indicador }: { indicador: IndicadorDelResumen }) {
  const { curso, conteo_secciones: conteo } = indicador;
  if (conteo.publicadas === 0) {
    return <p className="font-medium text-tinta">Todavía no hay cargas publicadas en este curso.</p>;
  }
  if (curso.calificados === 0) {
    return <p className="font-medium text-tinta">Las cargas publicadas no tienen estudiantes calificados.</p>;
  }
  const sinCarga = `${conteo.sin_dato} ${conteo.sin_dato === 1 ? "sección" : "secciones"} sin carga publicada`;
  return (
    <>
      <ul className="space-y-1">
        {curso.pct_sobre_calificados === null ? (
          <li className="font-medium text-tinta">Sin nivel esperado definido</li>
        ) : (
          <li className="font-titulo text-seccion font-semibold text-tinta">
            {`${fraccion(curso.logrados, curso.calificados)} alumnos en el nivel esperado o superior (${porcentaje(curso.pct_sobre_calificados)})`}
          </li>
        )}
        {curso.promedio_nivel !== null && <li className="text-tinta">{`Promedio de calificación ${promedio(curso.promedio_nivel)} de 4`}</li>}
        <li className="text-tinta">{`${conteo.en_meta} de ${conteo.publicadas} ${conteo.publicadas === 1 ? "sección publicada" : "secciones publicadas"} en la meta`}</li>
        {conteo.sin_dato > 0 && <li className="text-tinta">{sinCarga}</li>}
        {curso.sin_evidencia > 0 && (
          <li className="text-sm text-tinta-suave">
            {curso.sin_evidencia === 1
              ? "1 alumno sin evidencia, que no entra en el porcentaje ni en el promedio"
              : `${curso.sin_evidencia} alumnos sin evidencia, que no entran en el porcentaje ni en el promedio`}
          </li>
        )}
      </ul>
      {curso.pct_sobre_calificados !== null && (
        <>
          <BarraDelCurso curso={curso} metaPct={indicador.meta_pct} />
          <p className="mt-2 text-sm font-medium text-tinta">{estadoDelCurso(curso, indicador.meta_pct)}</p>
        </>
      )}
    </>
  );
}

/** La barra de una sección, con la línea de la meta. La cifra que dibuja está escrita en su fila. */
function BarraDeLaSeccion({ s, metaPct }: { s: SeccionDelResumen; metaPct: number | null }) {
  return (
    <>
      <div data-barra="seccion" aria-hidden="true" className="relative mt-1 h-3 w-full rounded" style={{ backgroundColor: COLORES.fondo }}>
        <div
          data-lleno
          className="h-3 rounded"
          style={{ width: `${s.pct_sobre_calificados}%`, backgroundColor: s.en_meta ? COLORES.enMeta : COLORES.debajo }}
        />
        <LineaDeMeta metaPct={metaPct} />
      </div>
      {metaPct !== null && <span className="mt-1 block text-xs text-tinta-suave">{`Meta ${meta(metaPct)}`}</span>}
    </>
  );
}

function FilaDeSeccion({ s, indicador }: { s: SeccionDelResumen; indicador: IndicadorDelResumen }) {
  const celda = "px-3 py-2 align-top";
  const encabezado = (
    <th scope="row" className={`${celda} font-semibold text-tinta`}>
      {s.numero}
    </th>
  );
  if (s.pct_sobre_calificados === null || s.logrados === null || s.calificados === null) {
    const texto =
      s.estado !== "PUBLICADA"
        ? "Sin carga publicada"
        : indicador.nivel_esperado === null
          ? "Sin nivel esperado, sin porcentaje"
          : `Sin calificaciones (${s.sin_evidencia ?? 0} sin evidencia)`;
    return (
      <tr className="border-b border-linea last:border-b-0">
        {encabezado}
        <td colSpan={4} className={`${celda} text-tinta-suave`}>
          {texto}
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-linea last:border-b-0">
      {encabezado}
      <td className={`${celda} whitespace-nowrap`}>
        {s.calificados}
        {(s.sin_evidencia ?? 0) > 0 && <span className="block text-xs text-tinta-suave">{`${s.sin_evidencia} sin evidencia`}</span>}
      </td>
      <td className={`${celda} min-w-36`}>
        <span className="whitespace-nowrap">{`${porcentaje(s.pct_sobre_calificados)} (${fraccion(s.logrados, s.calificados)})`}</span>
        <BarraDeLaSeccion s={s} metaPct={indicador.meta_pct} />
      </td>
      <td className={`${celda} whitespace-nowrap`}>{s.promedio_nivel === null ? "Sin dato" : promedio(s.promedio_nivel)}</td>
      <td className={celda}>{estadoDeLaSeccion(s.en_meta)}</td>
    </tr>
  );
}

function TablaDeSecciones({ indicador }: { indicador: IndicadorDelResumen }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-5">
      <h3 id={`${id}-titulo`} className="mb-2 text-sm font-semibold text-tinta-suave">
        Secciones
      </h3>
      <div
        role="region"
        aria-label={`Tabla de secciones del PI ${indicador.pi}`}
        tabIndex={0} // NOSONAR: región desplazable con role y nombre, como TablaRechazos (US-82 de la spec 008).
        className="overflow-x-auto rounded-md border border-linea bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <table aria-label={`Secciones del PI ${indicador.pi}`} className="w-full border-collapse text-left text-sm">
          <thead className="bg-pendiente-fondo text-tinta">
            <tr className="border-b border-borde-campo">
              <th scope="col" className="px-3 py-2 font-semibold">Sección</th>
              <th scope="col" className="px-3 py-2 font-semibold">Calificados</th>
              <th scope="col" className="px-3 py-2 font-semibold">Porcentaje</th>
              <th scope="col" className="px-3 py-2 font-semibold">Promedio</th>
              <th scope="col" className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {indicador.secciones.map((s) => (
              <FilaDeSeccion key={s.seccion_id} s={s} indicador={indicador} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BloqueDelPi({ indicador }: { indicador: IndicadorDelResumen }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-pi`} className="mb-8 border-t border-linea pt-5">
      <h2 id={`${id}-pi`} className="font-titulo text-seccion font-semibold text-tinta">
        {`PI ${indicador.pi} del SO ${indicador.so}`}
      </h2>
      {indicador.nivel_esperado !== null && (
        <p className="mt-1 text-sm text-tinta-suave">{`Nivel esperado ${indicador.nivel_esperado} de 4`}</p>
      )}
      {indicador.provisional && <Franja />}
      <div className={`${tarjeta} mt-3`}>
        <CifrasDelCursoBloque indicador={indicador} />
      </div>
      <TablaDeSecciones indicador={indicador} />
    </section>
  );
}

function SelectorDeCurso({ cursos, valor, alCambiar }: { cursos: CursosDelResumen["cursos"]; valor: string | undefined; alCambiar: (c: string) => void }) {
  return (
    <label className="mb-5 flex flex-wrap items-center gap-2 text-sm font-medium">
      Curso
      <select
        className="min-h-10 rounded-md border border-borde-campo bg-superficie px-2 py-1 text-tinta focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
      >
        {cursos.map((c) => (
          <option key={c.codigo} value={c.codigo}>
            {`${c.codigo} ${c.nombre}`}
          </option>
        ))}
      </select>
    </label>
  );
}

/** P8. Las cifras del curso y de cada sección por PI, y el selector de curso cuando la cuenta alcanza más de uno. */
export function ResumenCurso({ periodo, asignaturaInicial }: Props) {
  const [cursos, setCursos] = useState<CursosDelResumen["cursos"] | null>(null);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [elegida, setElegida] = useState<string | undefined>(undefined);
  const [resumen, setResumen] = useState<RespuestaResumen | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const asignatura = elegida ?? asignaturaInicial ?? cursos?.[0]?.codigo;

  // La ruta 21 da la lista de cursos del alcance. Con el curso de P7 su falla no detiene a P8, que sigue sin selector.
  useEffect(() => {
    if (periodo === undefined) return;
    let vigente = true;
    listarCursosDelResumen(periodo)
      .then((c) => vigente && setCursos(c.cursos))
      .catch((e) => vigente && setErrorCursos(mensajeDe(e)));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  useEffect(() => {
    if (periodo === undefined || asignatura === undefined) return;
    let vigente = true;
    setResumen(null);
    setErrorResumen(null);
    obtenerResumenCurso(periodo, asignatura)
      .then((r) => vigente && setResumen(r))
      .catch((e) => vigente && setErrorResumen(mensajeDe(e)));
    return () => {
      vigente = false;
    };
  }, [periodo, asignatura]);

  const sinCursos = cursos !== null && cursos.length === 0 && asignaturaInicial === undefined;
  const error = errorResumen ?? (asignaturaInicial === undefined ? errorCursos : null);
  const cargando = periodo !== undefined && !error && !sinCursos && resumen === null;

  return (
    <>
      <Titulo>{ROTULO_RESUMEN}</Titulo>
      {periodo === undefined && (
        <p className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta font-medium">
          Elija un periodo para ver el resumen del curso.
        </p>
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {sinCursos && (
        <p className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta font-medium">
          No hay cursos con plan de medición en este periodo para su cuenta.
        </p>
      )}
      {cursos !== null && cursos.length > 1 && <SelectorDeCurso cursos={cursos} valor={asignatura} alCambiar={setElegida} />}
      {cargando && <Espera>Cargando el resumen del curso…</Espera>}
      {resumen !== null && !errorResumen && (
        <>
          <p className="mb-6 max-w-prose text-sm text-tinta-suave">
            {`${resumen.asignatura.codigo} ${resumen.asignatura.nombre}, periodo ${resumen.periodo}`}
          </p>
          {resumen.indicadores.length === 0 ? (
            <p className="rounded-tarjeta border border-dashed border-borde-campo bg-superficie p-tarjeta font-medium">
              No hay cifras de este curso en este periodo para su cuenta.
            </p>
          ) : (
            resumen.indicadores.map((i) => <BloqueDelPi key={`${i.so}-${i.pi}`} indicador={i} />)
          )}
        </>
      )}
    </>
  );
}
