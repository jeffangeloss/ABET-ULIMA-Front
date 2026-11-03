import { defineConfig } from "@playwright/test";

// Prueba de humo contra el Front de Vite (5173), que reenvía /api a la API local (8000), o contra la vista previa de
// Vercel de URL_FRONT (T075). Solo Chromium. Las contraseñas no entran aquí: viajan por ABET_CLAVES_ARCHIVO. La clave
// de omisión de la protección de Vercel la agrega e2e/humo.spec.ts a las peticiones del navegador. DIR_RESULTADOS
// manda los resultados a una carpeta temporal, porque el error-context.md de un fallo copia lo que muestra la página,
// también el valor del campo de contraseña.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  outputDir: process.env.DIR_RESULTADOS ?? "test-results",
  use: {
    baseURL: process.env.URL_FRONT ?? "http://localhost:5173",
    browserName: "chromium",
    viewport: { width: 1100, height: 900 },
  },
});
