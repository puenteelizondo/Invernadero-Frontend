import { AlertTriangle, ChevronDown, Loader2, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { EASE_LEAF, spring, useCalm } from "../lib/motion";
import { SproutIllustration } from "./Illustrations";

/**
 * Primitivas de UI compartidas. Todas usan los tokens de
 * tailwind.config.js (brand = clorofila, neutral = grises de vidrio,
 * canvas/surface), así que funcionan igual en tema claro y oscuro.
 */

type IconType = ComponentType<{ className?: string }>;

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}) {
  const base =
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-150 ease-leaf active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";
  const variants: Record<string, string> = {
    primary:
      "bg-brand-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_6px_16px_-8px_rgb(var(--c-brand-900)/0.7)] hover:bg-brand-800 dark:bg-brand-500 dark:text-neutral-50 dark:hover:bg-brand-400",
    secondary:
      "border border-neutral-200 bg-surface text-neutral-800 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800",
    danger:
      "bg-red-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_6px_16px_-8px_rgb(220_38_38/0.6)] hover:bg-red-700 dark:hover:bg-red-400",
    ghost: "text-neutral-700 hover:bg-brand-50 hover:text-brand-800",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const fieldClass =
  "w-full min-h-[42px] rounded-xl border border-neutral-200 bg-surface px-3.5 py-2.5 text-sm text-neutral-900 transition placeholder:text-neutral-400 hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

/** <select> con el mismo look que Input y una flechita propia. */
export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${fieldClass} cursor-pointer appearance-none pr-10 ${className}`} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-neutral-700">{children}</label>;
}

/** Texto de ayuda pequeño debajo de un campo. */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-neutral-500">{children}</p>;
}

/** Panel base: superficie de "vidrio" con borde fino y sombra baja. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[1.25rem] border border-neutral-200/80 bg-surface p-5 shadow-pane ${className}`}>
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Estado vacío: un brote que crece en su maceta + mensaje que invita a actuar. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-dashed border-brand-300/70 bg-brand-50/50 px-6 py-10 text-center">
      <SproutIllustration className="mx-auto mb-3 h-20 w-20" />
      <p className="font-display text-lg font-semibold text-neutral-900">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-neutral-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Bloque de carga con la forma del contenido (reemplaza spinners genéricos). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Esqueleto de una página típica: cabecera + rejilla de tarjetas. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-[60vw]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36 rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: IconType;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-200 bg-brand-100 text-brand-700">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight text-neutral-900 sm:text-[2rem]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-neutral-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Fila de campos con el espaciado estándar de los formularios. */
export function Field({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

/** Botonera al pie de un formulario. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-neutral-200/70 pt-4">{children}</div>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal / bottom-sheet. En escritorio aparece centrado con un resorte;
 * en celular sube desde abajo y se puede cerrar arrastrándolo hacia
 * abajo desde la barrita. Atrapa el foco (Tab no se sale), cierra con
 * Escape y devuelve el foco a donde estaba al cerrar.
 */
export function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  tone = "brand",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: IconType;
  tone?: "brand" | "danger";
  children: ReactNode;
}) {
  const calm = useCalm();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useDragControls();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>("input, select, textarea") ?? panel;
      first?.focus({ preventScroll: true });
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const iconTile =
    tone === "danger" ? "border-red-200 bg-red-100 text-red-700" : "border-brand-200 bg-brand-100 text-brand-700";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[6px] dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-neutral-200/70 bg-surface shadow-2xl shadow-black/30 outline-none sm:rounded-[1.75rem]"
            initial={calm ? { opacity: 0 } : { opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: calm ? { duration: 0.15 } : spring }}
            exit={
              calm ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.18, ease: EASE_LEAF } }
            }
            drag={calm ? false : "y"}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Barrita para arrastrar (solo celular) */}
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden"
              onPointerDown={(e) => drag.start(e)}
              aria-hidden
            >
              <span className="h-1.5 w-11 rounded-full bg-neutral-300" />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200/70 px-5 pb-4 pt-2 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                {Icon && (
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconTile}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                )}
                <h2 id={titleId} className="truncate text-lg font-semibold text-neutral-900">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[78dvh] overflow-y-auto overscroll-contain p-5 text-base sm:max-h-[75vh] sm:p-6 [&_.text-sm]:text-base [&_.text-xs]:text-sm">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
  loading,
  error,
  extra,
  body,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  /** Mensaje de error de la acción (p. ej. el 409 del backend), se muestra dentro del diálogo. */
  error?: string | null;
  /** Acción alternativa opcional, a la izquierda de los botones. */
  extra?: ReactNode;
  /** Contenido opcional debajo del mensaje (p. ej. un selector de opciones). */
  body?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} icon={AlertTriangle} tone={danger ? "danger" : "brand"}>
      <p className="text-sm leading-relaxed text-neutral-700">{message}</p>
      {body}
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <FormActions>
        {extra}
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </FormActions>
    </Modal>
  );
}
