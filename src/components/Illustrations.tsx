import { motion } from "framer-motion";
import { EASE_LEAF, useCalm } from "../lib/motion";

/**
 * Ilustraciones propias (SVG) para estados vacíos y de éxito. Usan
 * currentColor y variables de tema, así que se ven bien en claro y
 * oscuro. Se animan una sola vez al aparecer (el brote "crece") y se
 * quedan quietas; con movimiento reducido aparecen ya dibujadas.
 */

/** Maceta de barro con un brote que crece. */
export function SproutIllustration({ className = "" }: { className?: string }) {
  const calm = useCalm();
  const grow = (delay: number) =>
    calm
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 0.9, delay, ease: EASE_LEAF },
        };
  const pop = (delay: number) =>
    calm
      ? {}
      : {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { type: "spring" as const, stiffness: 260, damping: 16, delay },
        };
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      {/* Sombra */}
      <ellipse cx="48" cy="86" rx="22" ry="3.5" className="fill-neutral-300/60" />
      {/* Maceta */}
      <path d="M28 58h40l-5 26a4 4 0 0 1-4 3H37a4 4 0 0 1-4-3z" fill="#C46A3F" />
      <rect x="25" y="52" width="46" height="9" rx="3" fill="#D98157" />
      <path d="M31 66h34" stroke="#A9562F" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Tierra */}
      <ellipse cx="48" cy="53" rx="20" ry="3" fill="#5B3A26" />
      {/* Tallo */}
      <motion.path
        d="M48 53 C48 44 47 36 48 26"
        fill="none"
        stroke="rgb(var(--c-brand-600))"
        strokeWidth="3.2"
        strokeLinecap="round"
        {...grow(0.1)}
      />
      {/* Hojas */}
      <motion.path
        d="M48 36 C40 36 33 31 32 22 C41 22 47 27 48 36Z"
        fill="rgb(var(--c-brand-400))"
        style={{ transformOrigin: "48px 36px" }}
        {...pop(0.6)}
      />
      <motion.path
        d="M48 30 C56 30 63 25 64 15 C55 15 49 21 48 30Z"
        fill="rgb(var(--c-brand-500))"
        style={{ transformOrigin: "48px 30px" }}
        {...pop(0.8)}
      />
    </svg>
  );
}

/** Planta sana y tranquila (para "sin alertas"). Las hojas respiran muy despacio. */
export function HealthyPlantIllustration({ className = "" }: { className?: string }) {
  const calm = useCalm();
  const breathe = calm
    ? {}
    : { animate: { rotate: [-2.5, 2.5, -2.5] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const } };
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <circle cx="92" cy="20" r="10" fill="#E2A72E" opacity="0.85" />
      <ellipse cx="60" cy="88" rx="30" ry="4" className="fill-neutral-300/60" />
      <path d="M40 62h40l-5 22a4 4 0 0 1-4 3H49a4 4 0 0 1-4-3z" fill="#C46A3F" />
      <rect x="37" y="57" width="46" height="8" rx="3" fill="#D98157" />
      <motion.g style={{ transformOrigin: "60px 58px" }} {...breathe}>
        <path d="M60 58 V30" stroke="rgb(var(--c-brand-600))" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 46 C50 47 41 41 40 30 C51 29 59 36 60 46Z" fill="rgb(var(--c-brand-400))" />
        <path d="M60 40 C70 41 79 35 80 24 C69 23 61 30 60 40Z" fill="rgb(var(--c-brand-500))" />
        <path d="M60 32 C55 26 55 18 60 12 C65 18 65 26 60 32Z" fill="rgb(var(--c-brand-300))" />
      </motion.g>
    </svg>
  );
}
