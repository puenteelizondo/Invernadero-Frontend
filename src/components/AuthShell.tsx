import { useState } from "react";
import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GreenhouseScene, phaseLabel, useLocalHour } from "./GreenhouseScene";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { EASE_LEAF, useCalm } from "../lib/motion";

/**
 * Marco de las pantallas de acceso (login, registro, recuperar y
 * restablecer contraseña). A un lado, el invernadero ilustrado con el
 * cielo de la hora real de este dispositivo; al otro, el formulario.
 * En celular la escena queda como franja superior.
 *
 * La escena es decorativa (aria-hidden): no muestra datos de sensores.
 */

function greeting(h: number) {
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
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
  const hour = useLocalHour();
  const calm = useCalm();
  const night = phaseLabel(hour) === "Noche";
  const item = (i: number) =>
    calm
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay: 0.12 + i * 0.08, ease: EASE_LEAF },
        };

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas lg:flex-row lg:p-4">
      <div className="absolute right-4 top-4 z-20 lg:right-8 lg:top-8">
        <ThemeToggle compact />
      </div>
      {/* Escena */}
      <GreenhouseScene
        hour={hour}
        humidity={night ? 70 : 45}
        growLight={night}
        className="h-[34dvh] min-h-[220px] shrink-0 rounded-b-[2rem] lg:h-auto lg:min-h-0 lg:flex-1 lg:rounded-[2rem]"
      >
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
        <div className="absolute left-5 top-5 lg:left-8 lg:top-8">
          <BrandMark tone="light" />
        </div>
        <motion.div className="absolute inset-x-5 bottom-5 text-white lg:inset-x-10 lg:bottom-10" {...item(0)}>
          <p className="font-display text-3xl font-semibold leading-none drop-shadow sm:text-4xl lg:text-6xl">
            {greeting(hour)}.
          </p>
          <p className="mt-2 max-w-md text-sm text-white/85 drop-shadow lg:mt-4 lg:text-lg">
            {night ? "Así va la noche afuera." : "Así va el día afuera."} Entra para ver cómo va adentro.
          </p>
        </motion.div>
      </GreenhouseScene>

      {/* Formulario */}
      <div className="relative flex flex-1 items-start justify-center px-5 pb-10 pt-8 lg:w-[32rem] lg:flex-none lg:items-center lg:px-14 lg:py-10">
        <div className="w-full max-w-sm">
          <motion.div className="mb-7" {...item(1)}>
            <h1 className="text-[2rem] font-semibold leading-tight text-neutral-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[0.95rem] text-neutral-600">{subtitle}</p>}
          </motion.div>
          <motion.div {...item(2)}>{children}</motion.div>
          {footer && (
            <motion.div className="mt-6 border-t border-neutral-200/80 pt-5 text-center text-sm text-neutral-600" {...item(3)}>
              {footer}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Enlace del pie de AuthShell. */
export const authLinkClass =
  "font-semibold text-brand-700 underline decoration-brand-300 underline-offset-[3px] transition hover:decoration-brand-600";

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
      <label className="group block">
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
        <span className="relative block">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition group-focus-within:text-brand-600" />
          <input
            type={isPassword && show ? "text" : type}
            className="min-h-[48px] w-full rounded-2xl border border-neutral-200 bg-surface py-3 pl-10 pr-11 text-[0.95rem] text-neutral-900 transition placeholder:text-neutral-400 hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={show}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </span>
      </label>
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
      aria-busy={loading || undefined}
      className="mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-[0.95rem] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_10px_24px_-12px_rgb(var(--c-brand-900)/0.8)] transition duration-150 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60 dark:bg-brand-500 dark:text-neutral-50 dark:hover:bg-brand-400"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
