import { useEffect, useRef } from "react";

/** Título h1 de cada pantalla. Recibe el foco al montarse para que el lector de pantalla anuncie el cambio. */
export function Titulo({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className="mb-4 text-2xl font-semibold outline-none">
      {children}
    </h1>
  );
}
