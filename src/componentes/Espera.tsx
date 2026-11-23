import type { ReactNode } from "react";

/**
 * Spec 008, US-81. Lo que se ve mientras una ruta responde, con role="status". El indicador late solo con motion-safe,
 * así que con prefers-reduced-motion queda quieto y el texto sigue diciendo qué se carga.
 */
export function Espera({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      data-componente="espera"
      className="my-3 flex items-center gap-3 rounded-md border-l-4 border-institucional bg-espera-fondo px-3 py-2 text-sm text-tinta"
    >
      <span data-indicador aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full bg-institucional motion-safe:animate-pulse" />
      <span>{children}</span>
    </div>
  );
}
