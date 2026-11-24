import type { ReactNode } from "react";

type Tipo = "error" | "aviso" | "confirmacion";

const clases: Record<Tipo, string> = {
  error: "border-error-borde bg-error-fondo text-error-texto",
  aviso: "border-aviso-borde bg-aviso-fondo text-aviso-texto",
  confirmacion: "border-confirmacion-borde bg-confirmacion-fondo text-confirmacion-texto",
};

/** Muestra el texto que devuelve la API sin reescribirlo. El error se anuncia como alerta. */
export function Mensaje({ tipo, children }: { tipo: Tipo; children: ReactNode }) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      data-componente={tipo}
      className={`my-3 rounded-md border-l-4 px-3 py-2 text-sm ${clases[tipo]}`}
    >
      {children}
    </div>
  );
}
