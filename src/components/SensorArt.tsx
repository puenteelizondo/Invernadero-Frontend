import { useId } from "react";

/**
 * Ilustraciones propias (SVG, dibujadas aquí) de cada tipo de sensor.
 * Cada una "se llena" o se mueve según `pct` (0..1 = dónde cae el valor
 * actual dentro del rango del tipo): el termómetro sube su mercurio, la
 * gota se llena de agua, el matraz de pH cambia de color, el reloj de
 * presión mueve su aguja, las aspas del viento giran más rápido, etc.
 *
 * Todo el dibujo vive en un viewBox de 64x64. El líquido se mueve con
 * una transición CSS de `transform` (suave, sin re-render de la forma) y
 * el oleaje / burbujas / giros usan animaciones SMIL nativas del SVG,
 * así que no hacen falta keyframes extra en Tailwind.
 */

export type SensorKind =
  | "temperature"
  | "humidity"
  | "soil_moisture"
  | "co2"
  | "ph"
  | "light"
  | "water_level"
  | "ec"
  | "pressure"
  | "wind_speed"
  | "oxygen"
  | "generic";

interface ArtProps {
  pct: number; // 0..1
  color: string; // hex del tipo
  animate: boolean;
  /** Valor real (solo lo usan los que cambian de color con él, como pH). */
  value?: number | null;
  hasValue: boolean;
}

/** Id único y seguro para usar en url(#...) (React useId trae ":"). */
function useUid() {
  return useId().replace(/:/g, "");
}

/** Líquido con oleaje que sube/baja. Se dibuja dentro de un <g clipPath>. */
function Liquid({
  pct,
  top,
  bottom,
  x0 = 0,
  x1 = 64,
  fill,
  animate,
  wave = true,
  opacity = 1,
}: {
  pct: number;
  top: number; // y del nivel cuando pct = 1
  bottom: number; // y del nivel cuando pct = 0
  x0?: number;
  x1?: number;
  fill: string;
  animate: boolean;
  wave?: boolean;
  opacity?: number;
}) {
  const travel = bottom - top;
  const w = x1 - x0;
  // Onda de 2 periodos para poder desplazarla un periodo completo sin salto.
  const p = w / 2;
  const wavePath = `M${x0 - p} ${top} q${p / 4} -3 ${p / 2} 0 t${p / 2} 0 t${p / 2} 0 t${p / 2} 0 t${p / 2} 0 t${p / 2} 0 t${p / 2} 0 t${p / 2} 0 V${bottom + 8} H${x0 - p} Z`;
  return (
    <g
      style={{
        transform: `translateY(${(1 - pct) * travel}px)`,
        transition: "transform 800ms cubic-bezier(.22,.8,.3,1)",
      }}
      opacity={opacity}
    >
      {wave ? (
        <path d={wavePath} fill={fill}>
          {animate && (
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to={`${p} 0`}
              dur="2.4s"
              repeatCount="indefinite"
            />
          )}
        </path>
      ) : (
        <rect x={x0} y={top} width={w} height={bottom - top + 10} fill={fill} />
      )}
    </g>
  );
}

function Bubbles({ cx, y0, y1, color, animate, n = 3 }: { cx: number[]; y0: number; y1: number; color: string; animate: boolean; n?: number }) {
  if (!animate) return null;
  return (
    <>
      {cx.slice(0, n).map((x, i) => (
        <circle key={i} cx={x} r={1.6 + (i % 2)} fill="#fff" fillOpacity={0.7} stroke={color} strokeOpacity={0.3} strokeWidth={0.5}>
          <animate attributeName="cy" from={y0} to={y1} dur={`${2.2 + i * 0.7}s`} begin={`${i * 0.6}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur={`${2.2 + i * 0.7}s`} begin={`${i * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </>
  );
}

/** Brillo de vidrio (línea blanca) sobre un tubo/recipiente. */
function Shine({ d }: { d: string }) {
  return <path d={d} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.65} />;
}

/* ------------------------------------------------------------------ */

function Thermometer({ pct, color, animate }: ArtProps) {
  const id = useUid();
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <rect x={28} y={7} width={8} height={44} rx={4} />
          <circle cx={32} cy={49} r={9.5} />
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={0.8} />
        </linearGradient>
      </defs>
      {/* cristal */}
      <rect x={25.5} y={4.5} width={13} height={46} rx={6.5} fill="#fff" stroke={color} strokeOpacity={0.35} strokeWidth={2} />
      <circle cx={32} cy={49} r={12} fill="#fff" stroke={color} strokeOpacity={0.35} strokeWidth={2} />
      <rect x={27} y={6} width={10} height={44} rx={5} fill="#fff" />
      <circle cx={32} cy={49} r={10.5} fill="#fff" />
      {/* marcas */}
      {[12, 18, 24, 30, 36].map((y, i) => (
        <line key={y} x1={41} x2={i % 2 === 0 ? 48 : 45} y1={y} y2={y} stroke={color} strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      ))}
      {/* mercurio */}
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={pct} top={11} bottom={47} x0={26} x1={38} fill={`url(#${id}g)`} animate={animate} wave={false} />
      </g>
      <Shine d="M30 13 V40" />
      <circle cx={29} cy={46} r={2.2} fill="#fff" opacity={0.6} />
    </g>
  );
}

function Droplet({ pct, color, animate }: ArtProps) {
  const id = useUid();
  const d = "M32 5 C32 5 12 27 12 41 a20 20 0 0 0 40 0 C52 27 32 5 32 5 Z";
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={d} />
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.85} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={d} fill="#fff" stroke={color} strokeOpacity={0.4} strokeWidth={2.4} strokeLinejoin="round" />
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={pct} top={18} bottom={60} fill={`url(#${id}g)`} animate={animate} />
        <Bubbles cx={[26, 36, 31]} y0={58} y1={30} color={color} animate={animate} />
      </g>
      <path d="M21 38 C21 33 24 29 27 26" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.7} />
    </g>
  );
}

function SoilMoisture({ pct, color, animate }: ArtProps) {
  const id = useUid();
  const pot = "M15 35 H49 L45 58 Q44.6 60 42.6 60 H21.4 Q19.4 60 19 58 Z";
  const leaf = 0.55 + pct * 0.6;
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={pot} />
        </clipPath>
      </defs>
      {/* brote: las hojas crecen con la humedad */}
      <g style={{ transform: `scale(${leaf})`, transformOrigin: "32px 35px", transition: "transform 800ms ease-out" }}>
        <path d="M32 35 C32 28 32 24 32 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path d="M32 26 C24 27 19 22 18 14 C26 13 31 18 32 26 Z" fill={color} />
        <path d="M32 22 C39 22 44 17 45 10 C38 9 33 14 32 22 Z" fill={color} opacity={0.85} />
        {animate && (
          <animateTransform attributeName="transform" type="rotate" values="-3 32 35;3 32 35;-3 32 35" dur="3.2s" repeatCount="indefinite" additive="sum" />
        )}
      </g>
      {/* maceta */}
      <path d={pot} fill="#b45309" fillOpacity={0.18} stroke="#92400e" strokeOpacity={0.55} strokeWidth={2} strokeLinejoin="round" />
      <g clipPath={`url(#${id}c)`}>
        <rect x={12} y={36} width={40} height={24} fill="#92400e" opacity={0.75} />
        <Liquid pct={pct} top={38} bottom={60} fill="#38bdf8" animate={animate} opacity={0.85} />
      </g>
      <rect x={12} y={31} width={40} height={6} rx={3} fill="#b45309" stroke="#92400e" strokeOpacity={0.6} strokeWidth={1.4} />
    </g>
  );
}

function Co2({ pct, color, animate }: ArtProps) {
  const id = useUid();
  const cloud = "M18 48 C9 48 7 37 14.5 34 C13.5 24 26 19.5 31 26.5 C36 18 51 22 48.5 33 C59 33.5 59 48 48.5 48 Z";
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={cloud} />
        </clipPath>
      </defs>
      <path d={cloud} fill="#fff" stroke={color} strokeOpacity={0.4} strokeWidth={2.4} strokeLinejoin="round" />
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={pct} top={18} bottom={50} fill={color} animate={animate} opacity={0.9} />
        <Bubbles cx={[22, 34, 44]} y0={48} y1={24} color={color} animate={animate} />
      </g>
      <text x={33} y={41} textAnchor="middle" fontSize={12} fontWeight={800} fontFamily="system-ui, sans-serif" fill="#fff" stroke={color} strokeWidth={2.6} paintOrder="stroke">
        CO₂
      </text>
      {/* chimenea de humo */}
      <circle cx={52} cy={14} r={2.4} fill={color} opacity={0.35}>
        {animate && <animate attributeName="cy" values="20;8" dur="3s" repeatCount="indefinite" />}
        {animate && <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />}
      </circle>
    </g>
  );
}

function Ph({ pct, color, animate, value, hasValue }: ArtProps) {
  const id = useUid();
  const flask = "M26 7 H38 V25 L52 52 Q54.5 58 48 58 H16 Q9.5 58 12 52 L26 25 Z";
  // Color del líquido = color de la tira de pH (0 rojo ácido -> verde neutro -> violeta alcalino).
  const liquid = hasValue && value != null ? `hsl(${Math.round(pct * 270)} 80% 52%)` : color;
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={flask} />
        </clipPath>
      </defs>
      <path d={flask} fill="#fff" stroke={liquid} strokeOpacity={0.45} strokeWidth={2.4} strokeLinejoin="round" style={{ transition: "stroke 600ms" }} />
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={Math.max(0.3, pct * 0.6 + 0.3)} top={30} bottom={60} fill={liquid} animate={animate} />
        <Bubbles cx={[28, 36, 32]} y0={56} y1={34} color={liquid} animate={animate} />
      </g>
      <rect x={24} y={4} width={16} height={5} rx={2.5} fill={liquid} style={{ transition: "fill 600ms" }} />
      <Shine d="M29 12 V24" />
    </g>
  );
}

function Sun({ pct, color, animate }: ArtProps) {
  const id = useUid();
  const rays = Array.from({ length: 12 });
  const inner = 17;
  const outer = 21 + pct * 7;
  const C = 2 * Math.PI * 28;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor={color} />
        </radialGradient>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* anillo de progreso */}
      <circle cx={32} cy={32} r={28} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={3} />
      <circle
        cx={32}
        cy={32}
        r={28}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dasharray 800ms ease-out" }}
      />
      {/* resplandor */}
      <circle cx={32} cy={32} r={14 + pct * 6} fill={color} opacity={0.15 + pct * 0.4} filter={`url(#${id}b)`} style={{ transition: "all 800ms" }} />
      {/* rayos */}
      <g>
        {rays.map((_, i) => (
          <line
            key={i}
            x1={32}
            y1={32 - inner}
            x2={32}
            y2={32 - outer}
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 32 32)`}
            opacity={i % 2 === 0 ? 1 : 0.6}
          />
        ))}
        {animate && <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="24s" repeatCount="indefinite" />}
      </g>
      <circle cx={32} cy={32} r={12.5} fill={`url(#${id}g)`} stroke="#fff" strokeWidth={1.5} />
      <path d="M26 28 C27 25.5 29 24 31 23.5" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
    </g>
  );
}

function Tank({ pct, color, animate, label }: ArtProps & { label?: string }) {
  const id = useUid();
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <rect x={12} y={10} width={40} height={46} rx={8} />
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.8} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <rect x={11} y={9} width={42} height={48} rx={9} fill="#fff" stroke={color} strokeOpacity={0.4} strokeWidth={2.4} />
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={pct} top={14} bottom={58} fill={`url(#${id}g)`} animate={animate} />
        <Bubbles cx={[22, 34, 44]} y0={54} y1={20} color={color} animate={animate} />
      </g>
      {[20, 29, 38, 47].map((y, i) => (
        <line key={y} x1={12} x2={i % 2 === 0 ? 20 : 17} y1={y} y2={y} stroke={color} strokeOpacity={0.55} strokeWidth={1.6} strokeLinecap="round" />
      ))}
      {label && (
        <text x={35} y={38} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily="system-ui, sans-serif" fill="#fff" stroke={color} strokeWidth={2.8} paintOrder="stroke">
          {label}
        </text>
      )}
      <Shine d="M47 16 V28" />
    </g>
  );
}

function Ec({ pct, color, animate }: ArtProps) {
  const id = useUid();
  return (
    <g>
      <defs>
        <clipPath id={`${id}c`}>
          <rect x={21} y={9} width={22} height={49} rx={8} />
        </clipPath>
      </defs>
      <rect x={27} y={2.5} width={10} height={6} rx={2} fill={color} />
      <rect x={19.5} y={7.5} width={25} height={52} rx={9.5} fill="#fff" stroke={color} strokeOpacity={0.4} strokeWidth={2.4} />
      <g clipPath={`url(#${id}c)`}>
        <Liquid pct={pct} top={12} bottom={58} fill={color} animate={animate} opacity={0.88} />
      </g>
      <path d="M34.5 17 L25 35 H31.5 L29.5 50 L40 30 H33.5 Z" fill="#fde047" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round">
        {animate && <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite" />}
      </path>
      <Shine d="M24 15 V28" />
    </g>
  );
}

function Pressure({ pct, color }: ArtProps) {
  const id = useUid();
  const R = 25;
  const start = -135;
  const sweep = 270;
  const polar = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [32 + r * Math.cos(a), 32 + r * Math.sin(a)] as const;
  };
  const arc = (from: number, to: number, r: number) => {
    const [x0, y0] = polar(from, r);
    const [x1, y1] = polar(to, r);
    return `M${x0} ${y0} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const angle = start + pct * sweep;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={color} stopOpacity={0.12} />
        </radialGradient>
      </defs>
      <circle cx={32} cy={32} r={29} fill="#fff" stroke={color} strokeOpacity={0.45} strokeWidth={3} />
      <circle cx={32} cy={32} r={26.5} fill={`url(#${id}g)`} />
      <path d={arc(start, start + sweep, R - 4)} stroke={color} strokeOpacity={0.18} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d={arc(start, start + Math.max(1, pct * sweep), R - 4)} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" style={{ transition: "all 800ms" }} />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = start + (i / 9) * sweep;
        const [x0, y0] = polar(a, R - 0.5);
        const [x1, y1] = polar(a, R - (i % 3 === 0 ? 8.5 : 6));
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round" />;
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "32px 32px", transition: "transform 900ms cubic-bezier(.3,1.4,.5,1)" }}>
        <path d="M32 11 L34.6 32 H29.4 Z" fill="#1f2937" />
        <circle cx={32} cy={32} r={4.6} fill="#1f2937" />
        <circle cx={32} cy={32} r={1.8} fill={color} />
      </g>
    </g>
  );
}

function Wind({ pct, color, animate }: ArtProps) {
  // Más viento -> las aspas giran más rápido.
  const dur = 7 - pct * 6;
  const blade = "M32 28 C26 22 25 12 32 6 C39 12 38 22 32 28 Z";
  return (
    <g>
      <path d="M31 34 H33 L34.5 60 H29.5 Z" fill={color} opacity={0.35} />
      <circle cx={32} cy={30} r={25} fill={color} opacity={0.08} />
      <g>
        {[0, 120, 240].map((r, i) => (
          <path key={r} d={blade} fill={color} opacity={i === 0 ? 1 : i === 1 ? 0.8 : 0.6} transform={`rotate(${r} 32 30)`} stroke="#fff" strokeWidth={1} strokeLinejoin="round" />
        ))}
        {animate && <animateTransform attributeName="transform" type="rotate" from="0 32 30" to="360 32 30" dur={`${dur}s`} repeatCount="indefinite" />}
      </g>
      <circle cx={32} cy={30} r={4.4} fill="#fff" stroke={color} strokeWidth={2} />
      {/* rachas */}
      <g stroke={color} strokeOpacity={0.45} strokeWidth={1.8} strokeLinecap="round" fill="none">
        <path d="M6 52 H16 q3 0 3 -3" />
        <path d="M46 56 H56 q3 0 3 3" />
      </g>
    </g>
  );
}

function Generic({ pct, color, animate }: ArtProps) {
  const C = 2 * Math.PI * 25;
  return (
    <g>
      <circle cx={32} cy={32} r={25} fill="#fff" stroke={color} strokeOpacity={0.18} strokeWidth={5} />
      <circle
        cx={32}
        cy={32}
        r={25}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dasharray 800ms ease-out" }}
      />
      {/* chip */}
      <rect x={22} y={22} width={20} height={20} rx={4} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />
      <rect x={27} y={27} width={10} height={10} rx={2} fill={color}>
        {animate && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />}
      </rect>
      {[26, 32, 38].map((p) => (
        <g key={p} stroke={color} strokeWidth={2} strokeLinecap="round">
          <line x1={p} x2={p} y1={17.5} y2={21} />
          <line x1={p} x2={p} y1={43} y2={46.5} />
          <line x1={17.5} x2={21} y1={p} y2={p} />
          <line x1={43} x2={46.5} y1={p} y2={p} />
        </g>
      ))}
    </g>
  );
}

/** Dibuja la ilustración que corresponde al tipo. */
export function SensorArt({ kind, ...p }: ArtProps & { kind: SensorKind }) {
  switch (kind) {
    case "temperature":
      return <Thermometer {...p} />;
    case "humidity":
      return <Droplet {...p} />;
    case "soil_moisture":
      return <SoilMoisture {...p} />;
    case "co2":
      return <Co2 {...p} />;
    case "ph":
      return <Ph {...p} />;
    case "light":
      return <Sun {...p} />;
    case "water_level":
      return <Tank {...p} />;
    case "oxygen":
      return <Tank {...p} label="O₂" />;
    case "ec":
      return <Ec {...p} />;
    case "pressure":
      return <Pressure {...p} />;
    case "wind_speed":
      return <Wind {...p} />;
    default:
      return <Generic {...p} />;
  }
}
