import axios from "axios";
import type { ApiErrorBody } from "../types";

// Todas las llamadas van a /api/v1/... -- gracias al proxy de Vite
// (vite.config.ts), el navegador nunca ve el origen real de Django,
// así que withCredentials + la cookie CSRF funcionan como si todo
// fuera el mismo sitio.
export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  // Django manda la cookie de CSRF como "csrftoken" y espera el token
  // de vuelta en el header "X-CSRFToken" -- axios sabe hacer esto
  // solo si le decimos los nombres exactos (por defecto usa los de
  // Laravel, "XSRF-TOKEN"/"X-XSRF-TOKEN", que no son los de Django).
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  // Desde axios 1.6, mandar el header CSRF automáticamente a partir de
  // la cookie dejó de ser el default cuando withCredentials es true
  // (por seguridad, para no filtrar el token a terceros) -- hay que
  // pedirlo explícitamente. Sin esto, TODOS los POST/PATCH/DELETE
  // (login, crear sensores, controlar actuadores, pedir token de
  // WebSocket...) fallaban con 403 "CSRF Failed", aunque la sesión
  // estuviera bien y la cookie csrftoken sí existiera.
  withXSRFToken: true,
});

/** Aplana el error de un 400 de DRF a una sola línea, para mostrar en la UI. */
export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorBody | undefined;

    if (status === 429) {
      const retryAfter = error.response?.headers?.["retry-after"];
      return retryAfter
        ? `Demasiadas peticiones. Intenta de nuevo en ${retryAfter} segundos.`
        : "Demasiadas peticiones. Intenta de nuevo en un momento.";
    }

    if (!error.response) {
      return "No se pudo conectar con el servidor. ¿Está corriendo el backend?";
    }

    // Una página HTML / texto plano (p. ej. la página de depuración de Django
    // en un 500) no es un error de validación: nunca se debe aplanar como
    // si fuera un objeto campo -> mensajes.
    if (typeof data === "string" || (status != null && status >= 500 && !(data && typeof data.detail === "string"))) {
      return `El servidor tuvo un error interno (${status}). Revisa la consola del backend para ver el detalle.`;
    }

    if (data) {
      if (typeof data.detail === "string") return data.detail;
      const parts: string[] = [];
      for (const [field, messages] of Object.entries(data)) {
        const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
        parts.push(field === "non_field_errors" ? text : `${field}: ${text}`);
      }
      if (parts.length) return parts.join(" · ");
    }
  }
  return "Ocurrió un error inesperado.";
}

/** Pide la cookie CSRF. Se llama una vez al arrancar la app (ver main.tsx). */
export async function ensureCsrfCookie() {
  await api.get("/auth/csrf/");
}
