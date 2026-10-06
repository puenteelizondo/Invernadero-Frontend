import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { spring, useMotionPref, type MotionPref } from "../lib/motion";

const OPTIONS: Array<{ value: MotionPref; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "full", label: "Sí" },
  { value: "reduced", label: "Quietas" },
];

/**
 * Control de animaciones. "Sistema" respeta la preferencia de movimiento
 * reducido del sistema operativo; "Sí" anima siempre; "Quietas" nunca.
 */
export function MotionToggle({ id = "motion" }: { id?: string }) {
  const { pref, setPref, systemReduces } = useMotionPref();
  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-neutral-500">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Animaciones
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="grid grid-cols-3 gap-1 rounded-xl border border-neutral-200 bg-neutral-100/70 p-1"
      >
        {OPTIONS.map((o) => {
          const active = pref === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPref(o.value)}
              className={`relative flex min-h-[34px] items-center justify-center rounded-lg text-xs font-medium transition ${
                active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-neutral-200"
                  transition={spring}
                />
              )}
              <span className="relative">{o.label}</span>
            </button>
          );
        })}
      </div>
      {pref === "system" && systemReduces && (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-amber-700">
          Tu sistema pide menos movimiento, por eso todo está quieto. Elige «Sí» para ver las animaciones.
        </p>
      )}
    </div>
  );
}
