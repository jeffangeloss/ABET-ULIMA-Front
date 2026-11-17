import type { ReactNode } from "react";

type Tipo = "error" | "aviso" | "confirmacion";

const clases: Record<Tipo, string> = {
  error: "border-red-700 bg-red-50 text-red-900",
  aviso: "border-amber-700 bg-amber-50 text-amber-900",
  confirmacion: "border-green-700 bg-green-50 text-green-900",
};

/** Muestra el texto que devuelve la API sin reescribirlo. El error se anuncia como alerta. */
export function Mensaje({ tipo, children }: { tipo: Tipo; children: ReactNode }) {
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`my-3 rounded border-l-4 px-3 py-2 text-sm ${clases[tipo]}`}>
      {children}
    </div>
  );
}
