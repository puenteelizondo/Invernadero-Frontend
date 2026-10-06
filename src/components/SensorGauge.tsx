import { useEffect, useRef, useState } from "react";
import { findSensorPreset } from "../lib/sensorPresets";
import { SensorArt, type SensorKind } from "./SensorArt";

/**
 * "Medidor" visual de un sensor: una ilustración propia de cada tipo
 * (termómetro, gota, matraz de pH, reloj de presión, aspas...) que se
 * llena o se mueve según dónde cae el valor actual dentro del rango del
 * tipo, y destella cada vez que llega una lectura nueva. Ver SensorArt.
 *
 * El rango sale del SensorType real (valid_min/valid_max). Si el tipo
 * no lo define, se usa el rango típico del preset solo para el dibujo;
 * si tampoco hay, se dibuja a la mitad y se avisa con "sin rango".
 */
export function SensorGauge({
  code,
  typeName,
  value,
  min,
  max,
  size = 64,
  live = true,
}: {
  code: string;
  /** Nombre del tipo (ej. "Oxigeno") -- ayuda a reconocer el dibujo si el código no coincide. */
  typeName?: string;
  value: number | null | undefined;
  min: number | null;
  max: number | null;
  size?: number;
  live?: boolean;
}) {
  const preset = findSensorPreset(code, typeName);
  const kind = (preset?.code ?? "generic") as SensorKind;
  const color = preset?.hex ?? "#16a34a";

  let lo = min;
  let hi = max;
  if (lo == null || hi == null || hi <= lo) {
    lo = preset?.valid_min ?? null;
    hi = preset?.valid_max ?? null;
  }
  const hasRange = lo != null && hi != null && hi > lo;
  const hasValue = value != null;

  let pct = 0.5;
  if (hasRange && hasValue) pct = Math.min(1, Math.max(0.04, (value - lo!) / (hi! - lo!)));
  else if (hasRange) pct = 0.12; // tipo con rango pero todavía sin dato: casi vacío

  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (live && value != null && value !== prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [live, value]);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={hasValue ? `${value}${preset?.default_unit ? ` ${preset.default_unit}` : ""}` : "Sin dato"}
    >
      {/* Halo suave de fondo del color del tipo */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${color}${flash ? "40" : "1f"}, transparent 70%)`,
          transform: flash ? "scale(1.18)" : "scale(1)",
        }}
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative overflow-visible transition-transform duration-300"
        style={{
          transform: flash ? "scale(1.1)" : "scale(1)",
          filter: flash ? `drop-shadow(0 0 5px ${color}99)` : `drop-shadow(0 1px 1px ${color}33)`,
          opacity: hasValue || hasRange ? 1 : 0.7,
        }}
        role="img"
        aria-label={preset?.name ?? "Sensor"}
      >
        <SensorArt kind={kind} pct={pct} color={color} animate={live && size >= 40} value={value} hasValue={hasValue} />
      </svg>

      {!hasRange && size >= 48 && (
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-neutral-500">
          sin rango
        </span>
      )}
    </div>
  );
}
