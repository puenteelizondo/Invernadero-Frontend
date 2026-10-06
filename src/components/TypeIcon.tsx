import { useEffect, useRef, useState } from "react";
import { Cpu, ToggleLeft } from "lucide-react";
import { findSensorPreset } from "../lib/sensorPresets";
import { findActuatorPreset } from "../lib/actuatorPresets";

/**
 * Ícono + color para un SensorType real, con match por `code`. Si el
 * tipo no tiene preset (fue creado con otro código), cae a un ícono
 * genérico -- nunca se inventa un preset que no exista.
 *
 * Con `live` en true, el ícono "se mueve" solo (una animación continua
 * y sutil propia de cada tipo -- ver `motion` en sensorPresets.ts) y
 * además hace un pulso/destello cada vez que `value` cambia, para que
 * se sienta que el dato realmente está llegando en vivo por WebSocket
 * y no es un dibujo estático.
 */
export function SensorIcon({
  code,
  className = "h-5 w-5",
  live = false,
  value,
}: {
  code: string;
  className?: string;
  live?: boolean;
  value?: number | null;
}) {
  const preset = findSensorPreset(code);
  const Icon = preset?.icon ?? Cpu;
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (live && value != null && value !== prevValue.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 550);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
    prevValue.current = value;
  }, [live, value]);

  const motion = live ? preset?.motion ?? "" : "";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full transition ${
        flash ? "animate-flash-ring bg-brand-50" : ""
      }`}
    >
      <Icon className={`${className} ${preset?.color ?? "text-neutral-500"} ${motion}`} />
    </span>
  );
}

export function ActuatorIcon({ code, className = "h-5 w-5" }: { code: string; className?: string }) {
  const preset = findActuatorPreset(code);
  const Icon = preset?.icon ?? ToggleLeft;
  return <Icon className={`${className} ${preset?.color ?? "text-neutral-500"}`} />;
}
