import { AlertTriangle, ChevronDown, Loader2, Sprout, X } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/** Primitivas de UI compartidas (Tailwind), para no repetir clases por todas las páginas. */

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
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-brand-600 to-emerald-500 text-white shadow-md shadow-brand-600/25 hover:-translate-y-0.5 hover:from-brand-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-brand-600/30",
    secondary:
      "border border-brand-200 bg-white text-brand-800 shadow-sm hover:border-brand-300 hover:bg-brand-50",
    danger:
      "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-600/25 hover:from-red-700 hover:to-rose-600",
    ghost: "text-neutral-700 hover:bg-brand-50 hover:text-brand-800",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

const fieldClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-inner shadow-neutral-100 transition placeholder:text-neutral-400 hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

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
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-neutral-700">{children}</label>;
}

/** Texto de ayuda pequeño debajo de un campo. */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-neutral-400">{children}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-900/5 transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mb-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand-300 bg-gradient-to-br from-brand-50/70 to-white p-10 text-center">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
        <Sprout className="h-7 w-7 animate-sway text-brand-600" />
      </span>
      <p className="font-semibold text-neutral-800">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="h-5 w-5 animate-spin text-brand-600" />;
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 text-white shadow-md shadow-brand-600/25">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-2xl text-sm text-neutral-500">{subtitle}</p>}
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
  return <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">{children}</div>;
}

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
  if (!open) return null;
  const header =
    tone === "danger"
      ? "from-red-600 to-rose-500"
      : "from-brand-600 to-emerald-500";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg animate-rise overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand-900/30">
        <div className={`relative flex items-center justify-between bg-gradient-to-r ${header} px-5 py-4 text-white`}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%), linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%)",
              backgroundPosition: "20px 0, 20px 0, 0 0, 0 0",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative flex items-center gap-3">
            {Icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="relative rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6 text-base [&_.text-sm]:text-base [&_.text-xs]:text-sm">{children}</div>
      </div>
    </div>
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
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} icon={AlertTriangle} tone={danger ? "danger" : "brand"}>
      <p className="text-sm leading-relaxed text-neutral-600">{message}</p>
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
