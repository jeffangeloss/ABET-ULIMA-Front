import type { Aviso } from "../servicios/tipos";

/** Avisos de la carga, aparte de los rechazos. Cada uno muestra el campo mensaje que manda la API. */
export function AvisosCarga({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-avisos" className="my-5">
      <h2 id="titulo-avisos" className="mb-2 font-titulo text-seccion font-semibold text-tinta">
        Avisos
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm marker:text-aviso-borde">
        {avisos.map((a, i) => (
          <li key={i}>{a.mensaje}</li>
        ))}
      </ul>
    </section>
  );
}
