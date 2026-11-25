import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// findBy y waitFor esperan hasta 1 s por omisión, y con la máquina cargada una pantalla que pide tres rutas simuladas
// tardaba más. Solo alarga la espera de lo que debe aparecer, porque queryBy y getBy siguen sin esperar.
configure({ asyncUtilTimeout: 10_000 });

// Spec 005, US-52. App guarda la pantalla en el fragmento de la dirección, así que cada prueba empieza sin fragmento y sin
// estado en la entrada actual del historial.
beforeEach(() => {
  window.history.replaceState(null, "", window.location.pathname);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
