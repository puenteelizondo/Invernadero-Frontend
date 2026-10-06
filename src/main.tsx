import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ensureCsrfCookie } from "./lib/api";
import { App } from "./App";
import { reloadOnceForNewVersion } from "./components/PageErrorBoundary";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./index.css";

// Pedimos la cookie CSRF una vez, antes de que la app haga cualquier
// POST/PATCH/DELETE (login, crear sensores, etc.) -- si no existe todavía
// esa cookie, Django rechaza esas peticiones con 403.
ensureCsrfCookie().catch(() => {
  // Si falla (backend caído), seguimos igual: la app mostrará el error
  // real cuando el usuario intente algo, en vez de bloquear el arranque.
});

// Si el frontend se recompiló con la pestaña abierta, Vite avisa al no poder
// precargar un archivo viejo: recargamos una vez para tomar la versión nueva.
window.addEventListener("vite:preloadError", (e) => {
  if (reloadOnceForNewVersion()) e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
