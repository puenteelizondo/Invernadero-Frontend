import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El backend (Django) corre en http://localhost:8000. En vez de llamarlo
// como un origen distinto desde el navegador (lo que obligaría a lidiar
// con CORS y con que las cookies de sesión sean "cross-site" -- un dolor
// de cabeza real en desarrollo con HTTP plano), el propio servidor de
// Vite le hace de proxy: el navegador solo habla con localhost:5173, y
// Vite reenvía /api y /ws a Django por detrás. Para el navegador, todo es
// el mismo origen -- las cookies de sesión y el token CSRF funcionan sin
// configuración especial.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
