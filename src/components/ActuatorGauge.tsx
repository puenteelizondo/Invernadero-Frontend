import { useEffect, useRef, useState } from "react";
import { findActuatorPreset } from "../lib/actuatorPresets";
import { ActuatorArt, type ActuatorKind } from "./ActuatorArt";

/**
 * Ilustración "viva" de un actuador: se ve encendido (en su color, con
 * movimiento propio del tipo) o apagado (gris y quieto), y hace un
 * destello cuando cambia de estado. Equivalente a SensorGauge. Ver
 * ActuatorArt para los dibujos.
 */
export function ActuatorGauge({
  code,
  typeName,
  on,
  size = 64,
  live = true,
}: {
  code: string;
  /** Nombre del tipo (ej. "Ventilador extractor") -- ayuda a reconocer el dibujo si el código no coincide. */
  typeName?: string;
  on: boolean;
  size?: number;
  live?: boolean;
}) {
  const preset = findActuatorPreset(code, typeName);
  const kind = (preset?.code ?? "generic") as ActuatorKind;
  const color = preset?.hex ?? "#16a34a";

  const [flash, setFlash] = useState(false);
  const prev = useRef(on);
  useEffect(() => {
    if (live && on !== prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prev.current = on;
      return () => clearTimeout(t);
    }
    prev.current = on;
  }, [live, on]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${preset?.name ?? "Actuador"}: ${on ? "encendido" : "apagado"}`}>
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${on ? color : "#94a3b8"}${on ? (flash ? "55" : "2a") : "14"}, transparent 70%)`,
          transform: flash ? "scale(1.2)" : "scale(1)",
        }}
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative overflow-visible transition-transform duration-300"
        style={{
          transform: flash ? "scale(1.1)" : "scale(1)",
          filter: on ? `drop-shadow(0 0 ${flash ? 6 : 3}px ${color}88)` : "drop-shadow(0 1px 1px #64748b22)",
        }}
        role="img"
        aria-label={`${preset?.name ?? "Actuador"} ${on ? "encendido" : "apagado"}`}
      >
        <ActuatorArt kind={kind} on={on} color={color} animate={live && size >= 40} />
      </svg>
    </div>
  );
}
