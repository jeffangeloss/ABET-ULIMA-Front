import type { Rechazo } from "../servicios/tipos";

/** Fila, PI y el mensaje de la API. No tiene columna para un valor leído porque la API no lo manda. */
export function TablaRechazos({ rechazos }: { rechazos: Rechazo[] }) {
  if (rechazos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-rechazos" className="my-4">
      <h2 id="titulo-rechazos" className="mb-2 text-lg font-semibold">
        Rechazos
      </h2>
      <table aria-label="Filas rechazadas" className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-400">
            <th scope="col" className="py-1 pr-3">Fila</th>
            <th scope="col" className="py-1 pr-3">PI</th>
            <th scope="col" className="py-1">Motivo y efecto</th>
          </tr>
        </thead>
        <tbody>
          {rechazos.map((r, i) => (
            <tr key={i} className="border-b border-slate-200 align-top">
              <td className="py-1 pr-3">{r.fila ?? (r.efecto === "RECHAZA_CARGA" ? "Archivo completo" : "No aplica")}</td>
              <td className="py-1 pr-3">{r.pi ?? "No aplica"}</td>
              <td className="py-1">{r.mensaje}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
