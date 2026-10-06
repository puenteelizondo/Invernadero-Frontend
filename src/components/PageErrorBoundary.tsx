import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

const RELOAD_KEY = "chunk-reload-at";

/**
 * ¿El error es "no se pudo descargar el código de esta página"? Pasa sobre
 * todo después de recompilar el frontend (docker compose up --build) con una
 * pestaña abierta: la pestaña pide archivos con el nombre (hash) viejo, que ya
 * no existen.
 */
export function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Unable to preload CSS/i.test(msg);
}

/** Recarga la página una sola vez (si ya se recargó hace menos de 15 s, no: evita un bucle). */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 15000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Si una página falla al cargar o al dibujarse, muestra un aviso con
 * "Recargar" en lugar de dejar la pantalla en blanco. El menú sigue
 * funcionando. Se monta con key = ruta, así que al navegar se reinicia.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Error en la página:", error, info.componentStack);
    if (isChunkError(error)) reloadOnceForNewVersion();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div role="alert" className="mx-auto mt-10 max-w-lg rounded-[1.25rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          {chunk ? "Hay una versión nueva de la página" : "Esta página no se pudo mostrar"}
        </div>
        <p className="mb-4 text-sm">
          {chunk
            ? "La aplicación se actualizó mientras la tenías abierta. Recarga para usar la versión nueva."
            : "Ocurrió un error inesperado. Recargar suele resolverlo; si se repite, avisa a quien administra el sistema."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <RotateCw className="h-4 w-4" aria-hidden /> Recargar
        </button>
      </div>
    );
  }
}
