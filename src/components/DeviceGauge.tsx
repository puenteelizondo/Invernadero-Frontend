import { boardKind, type DeviceStatus } from "../lib/deviceStatus";
import { DEVICE_COLORS, DeviceArt } from "./DeviceArt";

/** Ilustración de la placa de un dispositivo con su estado (en línea / sin señal / nunca visto / desactivado). */
export function DeviceGauge({
  name,
  status,
  size = 64,
  live = true,
}: {
  name: string;
  status: DeviceStatus;
  size?: number;
  live?: boolean;
}) {
  const color = DEVICE_COLORS[status];
  const kind = boardKind(name);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}${status === "online" ? "2a" : "14"}, transparent 70%)` }}
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative overflow-visible"
        style={{ filter: status === "online" ? `drop-shadow(0 0 3px ${color}66)` : "drop-shadow(0 1px 1px #64748b22)" }}
        role="img"
        aria-label={`Dispositivo ${name}`}
      >
        <DeviceArt kind={kind} status={status} animate={live && size >= 40} />
      </svg>
    </div>
  );
}
