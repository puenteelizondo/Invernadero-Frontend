import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "../lib/theme";
import { spring } from "../lib/motion";

const OPTIONS: Array<{ value: ThemePref; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Día", icon: Sun },
  { value: "dark", label: "Noche", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Selector de tema. `compact`: un solo botón que alterna día/noche.
 * Normal: control segmentado Día / Noche / Sistema con indicador que se desliza.
 */
export function ThemeToggle({ compact = false, id = "theme" }: { compact?: boolean; id?: string }) {
  const { isDark, pref, setPref, toggle } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Cambiar a tema de día" : "Cambiar a tema de noche"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-surface text-neutral-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700 active:scale-95"
      >
        <motion.span key={isDark ? "moon" : "sun"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={spring}>
          {isDark ? <Moon className="h-[1.1rem] w-[1.1rem]" /> : <Sun className="h-[1.1rem] w-[1.1rem]" />}
        </motion.span>
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-xl border border-neutral-200 bg-neutral-100/70 p-1">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPref(o.value)}
            className={`relative flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition ${
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
            <o.icon className="relative h-3.5 w-3.5" aria-hidden />
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
