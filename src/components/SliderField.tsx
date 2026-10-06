import { useEffect, useId, useState } from "react";

/**
 * Parámetro numérico con slider + campo numérico + unidad + explicación en
 * lenguaje simple. Los cambios quedan en el BORRADOR: `changed` resalta el campo.
 * El campo numérico admite valores fuera del recorrido del slider (dentro de min/max duros).
 */
export function SliderField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  sliderMin,
  sliderMax,
  step,
  help,
  changed,
  disabled,
  decimals = 2,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  /** Límites duros (el servidor los exige). */
  min?: number;
  max?: number;
  /** Recorrido cómodo del slider; por defecto, los límites duros. */
  sliderMin?: number;
  sliderMax?: number;
  step: number;
  help?: string;
  changed?: boolean;
  disabled?: boolean;
  decimals?: number;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(Math.round(value * 10 ** decimals) / 10 ** decimals));
      setInvalid(false);
    }
  }, [value, focused, decimals]);

  const lo = sliderMin ?? min ?? 0;
  const hi = Math.max(sliderMax ?? max ?? lo + 1, value, lo + step);

  function commit(raw: string) {
    setText(raw);
    const n = Number(raw.replace(",", "."));
    const ok = raw.trim() !== "" && Number.isFinite(n) && (min == null || n >= min) && (max == null || n <= max);
    setInvalid(!ok);
    if (ok) onChange(n);
  }

  return (
    <div className={`rounded-xl border p-3 transition-colors ${changed ? "border-brand-400 bg-brand-50/70" : "border-neutral-200 bg-surface"}`}>
      {/* El nombre puede partirse en dos renglones; el campo numérico NUNCA se encoge ni
          se sale de la tarjeta (antes la etiqueta "modificado" lo empujaba hacia afuera). */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-n`} className="block break-words text-sm font-semibold leading-snug text-neutral-800">
            {label}
          </label>
          {changed && (
            <span className="mt-1 inline-block rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white dark:bg-brand-500">
              modificado
            </span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <input
            id={`${id}-n`}
            type="text"
            inputMode="decimal"
            value={text}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={help ? `${id}-h` : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => commit(e.target.value)}
            className={`num h-9 w-[4.75rem] rounded-lg border bg-surface px-2 text-right text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-4 disabled:opacity-60 sm:w-24 ${
              invalid ? "border-red-400 focus:ring-red-500/20" : "border-neutral-200 focus:border-brand-500 focus:ring-brand-500/15"
            }`}
          />
          {unit && <span className="text-xs font-medium text-neutral-500">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} (deslizador)`}
        min={lo}
        max={hi}
        step={step}
        value={Math.min(hi, Math.max(lo, value))}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-6 w-full cursor-pointer accent-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {invalid && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          Valor no válido{min != null || max != null ? ` (entre ${min ?? "−∞"} y ${max ?? "∞"})` : ""}.
        </p>
      )}
      {help && (
        <p id={`${id}-h`} className="mt-1.5 text-xs leading-snug text-neutral-500">
          {help}
        </p>
      )}
    </div>
  );
}
