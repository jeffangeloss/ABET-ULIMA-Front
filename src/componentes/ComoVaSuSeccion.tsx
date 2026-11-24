import { fraccion, franjaProvisional, porcentaje } from "../servicios/formato";
import { leyendaDelSemaforo, textoDelEstado } from "../servicios/mejora";
import type { IndicadorDeCarga, IndicadoresCarga, Semaforo } from "../servicios/tipos";

/**
 * La luz de cada estado. Acompaña al texto con aria-hidden y nunca lo reemplaza, y un PI sin dato queda hueco y gris,
 * nunca rojo (US-46 de la spec 005).
 */
const LUZ: Record<Semaforo, string> = {
  VERDE: "bg-confirmacion-borde",
  AMBAR: "bg-aviso-borde",
  ROJO: "bg-error-borde",
  SIN_DATO: "border-2 border-borde-campo bg-superficie",
};

const SIN_DATO = "Sin dato";

/** La barra del logro, dibujada con HTML y el ancho en style (J-24), con la cifra escrita al lado. */
function Logro({ indicador }: { indicador: IndicadorDeCarga }) {
  const pct = indicador.pct_sobre_calificados;
  if (pct === null || indicador.semaforo === "SIN_DATO") return <>{pct === null ? SIN_DATO : porcentaje(pct)}</>;
  return (
    <span className="flex min-w-24 items-center gap-2">
      <span>{porcentaje(pct)}</span>
      <span data-barra aria-hidden="true" className="block h-2 w-12 shrink-0 rounded bg-linea">
        <span className="block h-2 rounded bg-institucional" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
    </span>
  );
}

function Fila({ indicador: i }: { indicador: IndicadorDeCarga }) {
  const sinDato = i.semaforo === "SIN_DATO";
  return (
    <tr className="border-b border-linea align-top last:border-b-0">
      <th scope="row" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
        {i.pi}
      </th>
      {i.estudiantes_por_nivel.map((n, k) => (
        <td key={k} className="px-3 py-2 text-right">
          {n}
        </td>
      ))}
      <td className="px-3 py-2 whitespace-nowrap">{i.logrados === null ? SIN_DATO : fraccion(i.logrados, i.calificados)}</td>
      {/* Un PI sin calificaciones no escribe el 0,0 % sobre el total, que se leería como un logro de cero. */}
      <td className="px-3 py-2 whitespace-nowrap">{sinDato || i.pct_sobre_total === null ? SIN_DATO : porcentaje(i.pct_sobre_total)}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Logro indicador={i} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{i.meta_pct === null ? SIN_DATO : porcentaje(i.meta_pct)}</td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <span data-luz={i.semaforo} aria-hidden="true" className={`inline-block size-3 shrink-0 rounded-full ${LUZ[i.semaforo]}`} />
          <span>{textoDelEstado(i)}</span>
        </span>
      </td>
    </tr>
  );
}

/**
 * Spec 005, US-46. «Cómo va su sección» de P4, con la franja provisional, la tabla de niveles del R-17 con el semáforo de
 * cada PI y la leyenda. Todo sale de la ruta 13, y P4 no compara cifras ni decide colores.
 */
export function ComoVaSuSeccion({ datos }: { datos: IndicadoresCarga }) {
  const franja = franjaProvisional(datos);
  const leyenda = leyendaDelSemaforo(datos.meta_pct, datos.corte_rojo_pct);
  return (
    <section aria-labelledby="titulo-como-va" className="my-5">
      <h2 id="titulo-como-va" className="mb-2 font-titulo text-seccion font-semibold text-tinta">
        Cómo va su sección
      </h2>
      {franja && <p className="my-3 rounded-md border-l-4 border-aviso-borde bg-aviso-fondo px-3 py-2 text-sm text-aviso-texto">{franja}</p>}
      <div
        role="region"
        aria-label="Tabla de niveles por PI"
        tabIndex={0} // NOSONAR: región desplazable con role y nombre; WebKit no enfoca un desplazable sin tabIndex (US-82).
        className="overflow-x-auto rounded-md border border-linea bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <table aria-label="Niveles y semáforo por PI" className="w-full border-collapse text-left text-sm">
          <thead className="bg-pendiente-fondo text-tinta">
            <tr className="border-b border-borde-campo">
              {["PI", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Logran / calificados", "% sobre el total", "Logro", "Meta", "Estado"].map(
                (c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    {c}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {datos.indicadores.map((i) => (
              <Fila key={i.pi} indicador={i} />
            ))}
          </tbody>
        </table>
      </div>
      {leyenda && <p className="mt-2 max-w-prose text-sm text-tinta-suave">{leyenda}</p>}
    </section>
  );
}
