import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { spring, useCalm } from "../lib/motion";

/**
 * Avisos breves apilables ("Copiado", "Cambios guardados"...). Uso:
 *   toast("Clave copiada")            // éxito
 *   toast("No se pudo…", "error")
 * Se montan una sola vez (<Toaster />) en la raíz de la app.
 */
type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  duration: number;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, tone: Tone = "success", duration = 3200) {
  items = [...items.slice(-3), { id: ++seq, message, tone, duration }];
  emit();
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE = {
  success: "text-brand-600",
  error: "text-red-600",
  info: "text-sky-600",
};
const BAR = { success: "bg-brand-500", error: "bg-red-500", info: "bg-sky-500" };

function ToastCard({ t }: { t: ToastItem }) {
  const calm = useCalm();
  useEffect(() => {
    const h = window.setTimeout(() => dismiss(t.id), t.duration);
    return () => window.clearTimeout(h);
  }, [t]);
  const Icon = ICON[t.tone];
  return (
    <motion.li
      layout={!calm}
      initial={calm ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      role={t.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-surface/95 px-4 py-3 text-sm text-neutral-800 shadow-lift backdrop-blur"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONE[t.tone]}`} aria-hidden />
      <span className="flex-1">{t.message}</span>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Cerrar aviso"
        className="-m-1 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X className="h-4 w-4" />
      </button>
      {/* Barra de tiempo restante */}
      <motion.span
        aria-hidden
        className={`absolute bottom-0 left-0 h-0.5 w-full origin-left ${BAR[t.tone]}`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: t.duration / 1000, ease: "linear" }}
      />
    </motion.li>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items
  );
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:right-6"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastCard key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
