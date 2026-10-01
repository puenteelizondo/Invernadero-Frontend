import { useState } from "react";
import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, ReactNode } from "react";
import { Droplets, Eye, EyeOff, Leaf, Loader2, Sprout, Sun, Thermometer, Wind } from "lucide-react";

/**
 * Marco compartido de las pantallas de acceso (login, registro,
 * recuperar/restablecer contraseña): a la izquierda un "invernadero"
 * decorativo con hojas flotando y tarjetas de sensores de adorno, a la
 * derecha el formulario en una tarjeta de cristal. En pantallas
 * chicas la parte decorativa se oculta y solo queda el formulario
 * sobre el fondo verde.
 *
 * Todo lo del lado izquierdo es puramente decorativo (aria-hidden): no
 * muestra datos reales de ningún sensor.
 */

const LEAVES = [
  { left: "8%", top: "12%", size: 28, delay: "0s", opacity: 0.35 },
  { left: "78%", top: "8%", size: 20, delay: "1.5s", opacity: 0.3 },
  { left: "62%", top: "28%", size: 34, delay: "3s", opacity: 0.25 },
  { left: "20%", top: "44%", size: 22, delay: "2s", opacity: 0.3 },
  { left: "85%", top: "52%", size: 26, delay: "4s", opacity: 0.28 },
  { left: "40%", top: "70%", size: 30, delay: "1s", opacity: 0.25 },
  { left: "10%", top: "82%", size: 24, delay: "5s", opacity: 0.3 },
  { left: "72%", top: "86%", size: 18, delay: "2.5s", opacity: 0.3 },
];

const CHIPS = [
  { icon: Thermometer, label: "Temperatura", value: "24.6 °C", color: "#ef4444", fill: 62 },
  { icon: Droplets, label: "Humedad", value: "71 %", color: "#0ea5e9", fill: 71 },
  { icon: Sun, label: "Luz", value: "18 400 lx", color: "#f59e0b", fill: 48 },
  { icon: Wind, label: "Viento", value: "6 km/h", color: "#14b8a6", fill: 25 },
];

function DecorChip({ chip, delay }: { chip: (typeof CHIPS)[number]; delay: string }) {
  const Icon = chip.icon;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 px-3.5 py-2.5 shadow-lg backdrop-blur-md animate-rise"
      style={{ animationDelay: delay }}
    >
      <span
        className="relative flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-white/30"
        aria-hidden
      >
        <span
          className="absolute inset-x-0 bottom-0 transition-all"
          style={{ height: `${chip.fill}%`, background: `${chip.color}cc` }}
        />
        <Icon className="relative mb-2.5 h-5 w-5 text-white drop-shadow" />
      </span>
      <div className="leading-tight">
        <p className="text-[11px] uppercase tracking-wide text-white/70">{chip.label}</p>
        <p className="text-sm font-semibold text-white">{chip.value}</p>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-600">
      {/* Rombos de "vidrio de invernadero" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%), linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%)",
          backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Halos de luz */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-lime-300/20 blur-3xl" />

      {/* Lado decorativo */}
      <div className="relative hidden flex-1 flex-col justify-between p-10 lg:flex xl:p-14" aria-hidden>
        {LEAVES.map((l, i) => (
          <Leaf
            key={i}
            className="absolute animate-float text-white"
            style={{ left: l.left, top: l.top, width: l.size, height: l.size, opacity: l.opacity, animationDelay: l.delay }}
          />
        ))}
        {/* Nube que cruza */}
        <div className="pointer-events-none absolute left-0 top-24 h-8 w-40 animate-drift rounded-full bg-white/15 blur-md" />
        <div className="pointer-events-none absolute left-0 top-64 h-6 w-28 animate-drift rounded-full bg-white/10 blur-md [animation-delay:-9s]" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur">
            <Sprout className="h-6 w-6 animate-sway text-white" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-white">Invernadero</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            Tu invernadero,
            <span className="block bg-gradient-to-r from-lime-200 via-white to-emerald-200 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
              siempre a la vista.
            </span>
          </h2>
          <p className="mt-4 max-w-sm text-base text-white/75">
            Temperatura, humedad, riego y ventilación en tiempo real, con lo que tus controladores
            mandan directo desde el campo.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {CHIPS.map((c, i) => (
              <DecorChip key={c.label} chip={c} delay={`${0.15 * i + 0.2}s`} />
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">Monitoreo y control de invernaderos</p>
      </div>

      {/* Lado del formulario */}
      <div className="relative flex w-full items-center justify-center px-4 py-10 lg:w-[30rem] lg:shrink-0 lg:px-10 xl:w-[34rem]">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur">
              <Sprout className="h-7 w-7 animate-sway text-white" />
            </span>
            <span className="text-lg font-semibold text-white">Invernadero</span>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/90 p-7 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
            </div>
            {children}
          </div>

          {footer && <div className="mt-5 text-center text-sm text-white/85">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** Enlace claro para el pie de AuthShell (que va sobre fondo verde oscuro). */
export const authLinkClass = "font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white";

/** Campo con ícono a la izquierda (y botón de mostrar/ocultar si es contraseña). */
export function AuthField({
  label,
  icon: Icon,
  type = "text",
  ...rest
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
        <input
          type={isPassword && show ? "text" : type}
          className="w-full rounded-xl border border-neutral-200 bg-white/80 py-2.5 pl-10 pr-10 text-sm shadow-inner shadow-neutral-100 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-700"
            title={show ? "Ocultar" : "Mostrar"}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Botón principal grande de las pantallas de acceso. */
export function AuthButton({
  loading,
  children,
  ...rest
}: { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:from-brand-700 hover:to-emerald-600 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
