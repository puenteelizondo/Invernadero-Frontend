import { useCallback, useSyncExternalStore } from "react";
import { type Transition, type Variants } from "framer-motion";

/**
 * Lenguaje de movimiento único de la app: mismas curvas y duraciones en
 * todas partes. "leaf" = salida suave como una hoja que se asienta.
 */
export const EASE_LEAF = [0.22, 1, 0.36, 1] as const;

export const DURATION = { fast: 0.16, base: 0.28, slow: 0.5 } as const;

export const spring: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 };
export const softSpring: Transition = { type: "spring", stiffness: 220, damping: 26 };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_LEAF } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: "easeIn" } },
};

/**
 * Preferencia de animaciones:
 *  - "system": sigue al sistema operativo (en Windows: Configuración →
 *    Accesibilidad → Efectos visuales → Efectos de animación).
 *  - "full": siempre animado, aunque el sistema pida menos movimiento.
 *  - "reduced": siempre quieto.
 * Se guarda en localStorage y se refleja como clase en <html>
 * (motion-full / motion-reduce), que es lo que lee index.css.
 */
export type MotionPref = "system" | "full" | "reduced";
const KEY = "motion";
const listeners = new Set<() => void>();
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
media?.addEventListener("change", () => listeners.forEach((l) => l()));

function readMotionPref(): MotionPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "full" || v === "reduced" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function isCalm() {
  const pref = readMotionPref();
  return pref === "reduced" || (pref === "system" && !!media?.matches);
}

export function useMotionPref() {
  const pref = useSyncExternalStore(subscribe, readMotionPref);
  const systemReduces = useSyncExternalStore(subscribe, () => !!media?.matches);
  const setPref = useCallback((p: MotionPref) => {
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* sin almacenamiento: dura solo esta sesión */
    }
    const root = document.documentElement;
    root.classList.toggle("motion-full", p === "full");
    root.classList.toggle("motion-reduce", p === "reduced");
    listeners.forEach((l) => l());
  }, []);
  return { pref, setPref, systemReduces };
}

/** true si hay que mostrar todo quieto (preferencia del usuario o del sistema). */
export function useCalm() {
  return useSyncExternalStore(subscribe, isCalm);
}
