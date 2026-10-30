import type { Aviso } from "../servicios/tipos";

/** Avisos de la carga, aparte de los rechazos. Cada uno muestra el campo mensaje que manda la API. */
export function AvisosCarga({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-avisos" className="my-4">
      <h2 id="titulo-avisos" className="mb-2 text-lg font-semibold">
        Avisos
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {avisos.map((a, i) => (
          <li key={i}>{a.mensaje}</li>
        ))}
      </ul>
    </section>
  );
}
