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
    css: false,
  },
});
