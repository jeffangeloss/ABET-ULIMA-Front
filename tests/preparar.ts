import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// findBy y waitFor esperan hasta 1 s por omisión, y con la máquina cargada una pantalla que pide tres rutas simuladas
// tardaba más. Solo alarga la espera de lo que debe aparecer, porque queryBy y getBy siguen sin esperar.
configure({ asyncUtilTimeout: 10_000 });

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
