import { defineConfig } from "@playwright/test";

// Prueba de humo contra el Front de Vite (5173), que reenvía /api a la API local (8000).
// Solo Chromium. Las contraseñas no entran aquí: viajan por ABET_CLAVES_ARCHIVO.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: process.env.URL_FRONT ?? "http://localhost:5173",
    browserName: "chromium",
    viewport: { width: 1100, height: 900 },
  },
});
