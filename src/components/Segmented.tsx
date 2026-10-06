import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { spring } from "../lib/motion";

/**
 * Control segmentado accesible (radiogroup): flechas ← → ↑ ↓ cambian la opción,
 * Tab entra y sale del grupo, y el indicador se desliza entre opciones.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir || disabled) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative flex w-full gap-0.5 rounded-xl border border-neutral-200 bg-neutral-100 p-1 ${disabled ? "opacity-60" : ""} ${className}`}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative min-h-[40px] min-w-0 flex-1 rounded-lg px-2 text-sm font-semibold transition-colors ${
              checked ? "text-brand-800" : "text-neutral-600 hover:text-neutral-900"
            } disabled:cursor-not-allowed`}
          >
            {checked && (
              <motion.span
                layoutId={`seg-${uid}`}
                className="absolute inset-0 rounded-lg border border-brand-200 bg-surface shadow-sm"
                transition={spring}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
