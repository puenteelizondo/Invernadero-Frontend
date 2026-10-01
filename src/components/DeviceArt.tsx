import type { BoardKind, DeviceStatus } from "../lib/deviceStatus";

/**
 * Ilustraciones propias (SVG) de la placa de un dispositivo: ESP32,
 * Arduino o Raspberry Pi (se elige por el nombre, ver boardKind). En
 * línea: el LED parpadea y salen ondas WiFi. Sin señal reciente: LED
 * ámbar quieto. Nunca visto o desactivado: todo en gris.
 */

interface ArtProps {
  status: DeviceStatus;
  animate: boolean;
}

const COLORS: Record<DeviceStatus, string> = {
  online: "#16a34a",
  idle: "#f59e0b",
  never: "#94a3b8",
  inactive: "#94a3b8",
};

function Wifi({ status, animate }: ArtProps) {
  const c = COLORS[status];
  const live = status === "online";
  return (
    <g fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round" opacity={status === "inactive" ? 0.4 : 1}>
      {[6, 11, 16].map((r, i) => (
        <path key={r} d={`M${32 - r} ${12 - r * 0.15} A${r * 1.25} ${r * 1.25} 0 0 1 ${32 + r} ${12 - r * 0.15}`} opacity={live ? 1 : 0.35}>
          {live && animate && <animate attributeName="opacity" values="0.15;1;0.15" dur="1.8s" begin={`${i * 0.25}s`} repeatCount="indefinite" />}
        </path>
      ))}
      <circle cx={32} cy={14.5} r={1.8} fill={c} stroke="none" />
    </g>
  );
}

function Led({ x, y, status, animate }: ArtProps & { x: number; y: number }) {
  const c = status === "online" ? "#22c55e" : status === "idle" ? "#f59e0b" : "#cbd5e1";
  return (
    <circle cx={x} cy={y} r={2.4} fill={c}>
      {status === "online" && animate && <animate attributeName="opacity" values="1;0.25;1" dur="1s" repeatCount="indefinite" />}
    </circle>
  );
}

function Esp32({ status, animate }: ArtProps) {
  const c = COLORS[status];
  return (
    <g>
      <Wifi status={status} animate={animate} />
      {/* placa */}
      <rect x={14} y={22} width={36} height={38} rx={5} fill="#fff" stroke={c} strokeOpacity={0.7} strokeWidth={2.4} />
      {/* pines */}
      {[27, 32, 37, 42, 47, 52, 57].map((y) => (
        <g key={y}>
          <rect x={10.5} y={y - 1.4} width={4} height={2.8} rx={1} fill={c} opacity={0.75} />
          <rect x={49.5} y={y - 1.4} width={4} height={2.8} rx={1} fill={c} opacity={0.75} />
        </g>
      ))}
      {/* módulo con antena */}
      <rect x={19} y={25} width={26} height={16} rx={2.5} fill={c} opacity={0.18} stroke={c} strokeOpacity={0.6} strokeWidth={1.6} />
      <path d="M22 28 h5 v4 h4 v-4 h4 v4 h4" fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" opacity={0.85} />
      <rect x={25} y={34.5} width={14} height={4.5} rx={1} fill={c} opacity={0.55} />
      {/* USB */}
      <rect x={26} y={56} width={12} height={6} rx={1.5} fill="#94a3b8" />
      <Led x={43} y={46} status={status} animate={animate} />
      <rect x={21} y={45} width={6} height={3} rx={1} fill={c} opacity={0.4} />
    </g>
  );
}

function Arduino({ status, animate }: ArtProps) {
  const c = status === "online" ? "#0891b2" : status === "idle" ? "#f59e0b" : "#94a3b8";
  return (
    <g>
      <Wifi status={status} animate={animate} />
      <rect x={5} y={24} width={54} height={34} rx={4} fill={c} fillOpacity={0.14} stroke={c} strokeWidth={2.4} />
      {/* cabeceras */}
      <rect x={14} y={25.5} width={40} height={4.5} rx={1} fill="#334155" opacity={0.85} />
      <rect x={14} y={52} width={40} height={4.5} rx={1} fill="#334155" opacity={0.85} />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <rect x={16 + i * 5} y={26.6} width={2} height={2.2} fill="#e2e8f0" />
          <rect x={16 + i * 5} y={53.2} width={2} height={2.2} fill="#e2e8f0" />
        </g>
      ))}
      {/* USB-B */}
      <rect x={2} y={33} width={13} height={14} rx={2} fill="#94a3b8" stroke="#64748b" strokeWidth={1.4} />
      {/* chip + infinito */}
      <rect x={36} y={35} width={15} height={8} rx={1.5} fill="#1e293b" opacity={0.85} />
      <path d="M22 41 c-2 -4 -6 -4 -6 0 s4 4 6 0 s6 -4 6 0 s-4 4 -6 0 z" fill="none" stroke={c} strokeWidth={1.8} transform="translate(2 -0.5)" />
      <Led x={30} y={47} status={status} animate={animate} />
    </g>
  );
}

function Raspberry({ status, animate }: ArtProps) {
  const c = status === "online" ? "#16a34a" : status === "idle" ? "#f59e0b" : "#94a3b8";
  return (
    <g>
      <Wifi status={status} animate={animate} />
      <rect x={5} y={22} width={54} height={38} rx={5} fill={c} fillOpacity={0.14} stroke={c} strokeWidth={2.4} />
      {/* GPIO */}
      {[0, 1].map((row) =>
        Array.from({ length: 13 }).map((_, i) => <circle key={`${row}${i}`} cx={12 + i * 3.4} cy={26 + row * 3} r={0.9} fill="#334155" opacity={0.8} />)
      )}
      {/* chip */}
      <rect x={15} y={35} width={14} height={14} rx={2} fill="#1e293b" opacity={0.85} />
      <rect x={18} y={38} width={8} height={8} rx={1} fill={c} opacity={0.6} />
      {/* USB */}
      {[30, 40, 50].map((y) => (
        <rect key={y} x={44} y={y - 3.5} width={13} height={7} rx={1.5} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
      ))}
      <Led x={10} y={54} status={status} animate={animate} />
      <circle cx={16} cy={54} r={2.2} fill={status === "inactive" || status === "never" ? "#cbd5e1" : "#ef4444"} />
    </g>
  );
}

export function DeviceArt({ kind, ...p }: ArtProps & { kind: BoardKind }) {
  if (kind === "arduino") return <Arduino {...p} />;
  if (kind === "raspberry") return <Raspberry {...p} />;
  return <Esp32 {...p} />;
}

export const DEVICE_COLORS = COLORS;
