import type { Rechazo } from "../servicios/tipos";

/**
 * Fila, PI y el mensaje de la API. No tiene columna para un valor leído porque la API no lo manda. La tabla se desplaza
 * de lado dentro de su región, que el teclado alcanza, y no la página (spec 008, US-82).
 */
export function TablaRechazos({ rechazos }: { rechazos: Rechazo[] }) {
  if (rechazos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-rechazos" className="my-5">
      <h2 id="titulo-rechazos" className="mb-2 font-titulo text-seccion font-semibold text-tinta">
        Rechazos
      </h2>
      <div
        role="region"
        aria-label="Tabla de filas rechazadas"
        tabIndex={0}
        className="overflow-x-auto rounded-md border border-linea bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <table aria-label="Filas rechazadas" className="w-full border-collapse text-left text-sm">
          <thead className="bg-pendiente-fondo text-tinta">
            <tr className="border-b border-borde-campo">
              <th scope="col" className="px-3 py-2 font-semibold">Fila</th>
              <th scope="col" className="px-3 py-2 font-semibold">PI</th>
              <th scope="col" className="px-3 py-2 font-semibold">Motivo y efecto</th>
            </tr>
          </thead>
          <tbody>
            {rechazos.map((r, i) => (
              <tr key={i} className="border-b border-linea align-top last:border-b-0">
                <td className="px-3 py-2 whitespace-nowrap">{r.fila ?? (r.efecto === "RECHAZA_CARGA" ? "Archivo completo" : "No aplica")}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.pi ?? "No aplica"}</td>
                <td className="px-3 py-2">{r.mensaje}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
