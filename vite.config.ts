import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// El navegador siempre llama a /api en su propio origen. En local, el proxy reenvía esa ruta
// hacia la API que corre en la misma máquina; en Vercel lo hace el vercel.json (ADR-004).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/preparar.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Spec 008, US-81. La prueba de contraste lee el texto de src/index.css y del CSS construido con ?raw, y lo demás sigue sin CSS.
    css: { include: [/src\/index\.css/, /dist\/assets\/.*\.css/] },
    // Vitest 5 guarda en disco cada módulo transformado y lo reutiliza mientras el archivo de prueba no cambie, con el
    // resultado de import.meta.glob incluido. Así, la revisión de dist/ podía leer una construcción vieja o ninguna.
    fsModuleCache: false,
    // Las pruebas que recorren App con userEvent tardan de 1 a 2 s solas y pasaban el tope de 5 s de Vitest con la
    // máquina cargada (revisión del segundo bloque de la spec 008). El tope sube y las esperas de findBy suben en
    // tests/preparar.ts, sin cambiar lo que cada prueba exige.
    testTimeout: 30_000,
  },
});
