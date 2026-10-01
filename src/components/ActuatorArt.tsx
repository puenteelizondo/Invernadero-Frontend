/**
 * Ilustraciones propias (SVG, dibujadas aquí) de cada tipo de actuador.
 * Cambian según esté encendido o apagado: el ventilador gira, la bomba
 * manda agua por su tubo, la válvula gira su palanca, el calefactor se
 * pone al rojo vivo, el foco se ilumina, etc. Apagado todo se ve en gris
 * y quieto. Mismo viewBox 64x64 y mismo criterio que SensorArt.
 *
 * Las animaciones usan SMIL nativo del SVG (sin keyframes extra) y solo
 * corren si el actuador está encendido y `animate` es true.
 */

import { useId } from "react";

export type ActuatorKind =
  | "fan"
  | "water_pump"
  | "valve"
  | "heater"
  | "light"
  | "cooler"
  | "curtain"
  | "mister"
  | "generic";

interface ArtProps {
  on: boolean;
  color: string;
  animate: boolean;
}

const OFF = "#94a3b8"; // gris apagado

function useUid() {
  return useId().replace(/:/g, "");
}

function Fan({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  const blade = "M32 29 C23 26 20 13 29 7 C36 11 38 23 32 29 Z";
  return (
    <g>
      <circle cx={32} cy={32} r={28} fill="#fff" stroke={c} strokeOpacity={0.45} strokeWidth={2.6} />
      <circle cx={32} cy={32} r={24} fill={c} opacity={on ? 0.08 : 0.04} />
      <g>
        {[0, 90, 180, 270].map((r, i) => (
          <path key={r} d={blade} fill={c} opacity={on ? 1 - i * 0.12 : 0.55} transform={`rotate(${r} 32 32)`} stroke="#fff" strokeWidth={1} strokeLinejoin="round" />
        ))}
        {on && animate && <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="0.9s" repeatCount="indefinite" />}
      </g>
      <circle cx={32} cy={32} r={5} fill="#fff" stroke={c} strokeWidth={2.4} />
      {on && (
        <g stroke={color} strokeOpacity={0.5} strokeWidth={1.8} strokeLinecap="round" fill="none">
          <path d="M57 26 q4 -2 6 0">
            {animate && <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />}
          </path>
          <path d="M58 34 q4 -2 6 0">
            {animate && <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />}
          </path>
        </g>
      )}
    </g>
  );
}

function WaterPump({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  return (
    <g>
      {/* base */}
      <rect x={6} y={54} width={52} height={5} rx={2.5} fill={c} opacity={0.35} />
      {/* motor */}
      <rect x={7} y={24} width={22} height={26} rx={5} fill="#fff" stroke={c} strokeOpacity={0.6} strokeWidth={2.2} />
      {[30, 35, 40, 45].map((y) => (
        <line key={y} x1={11} x2={25} y1={y} y2={y} stroke={c} strokeOpacity={0.35} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      {/* voluta */}
      <circle cx={41} cy={38} r={13} fill="#fff" stroke={c} strokeOpacity={0.7} strokeWidth={2.4} />
      <g>
        {[0, 120, 240].map((r) => (
          <path key={r} d="M41 38 C38 32 41 28 45 29 C44 33 43 36 41 38 Z" fill={c} opacity={0.9} transform={`rotate(${r} 41 38)`} />
        ))}
        {on && animate && <animateTransform attributeName="transform" type="rotate" from="0 41 38" to="360 41 38" dur="0.7s" repeatCount="indefinite" />}
      </g>
      <circle cx={41} cy={38} r={2.4} fill="#fff" stroke={c} strokeWidth={1.4} />
      {/* tubo de salida */}
      <rect x={37} y={6} width={8} height={19} rx={2} fill="#fff" stroke={c} strokeOpacity={0.6} strokeWidth={2} />
      {on && (
        <>
          <rect x={39} y={7} width={4} height={17} fill={color} opacity={0.35} />
          <line x1={41} x2={41} y1={24} y2={7} stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray="3 5">
            {animate && <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.6s" repeatCount="indefinite" />}
          </line>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={49 + i * 3} r={1.6} fill={color} opacity={0.7}>
              {animate && <animate attributeName="cy" values="8;22" dur="0.9s" begin={`${i * 0.3}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </>
      )}
      {/* tubo de entrada */}
      <rect x={1} y={30} width={6} height={8} rx={1.5} fill={c} opacity={0.4} />
    </g>
  );
}

function Valve({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  return (
    <g>
      {/* tubería vista desde arriba */}
      <rect x={2} y={25} width={60} height={14} rx={3} fill="#fff" stroke={c} strokeOpacity={0.5} strokeWidth={2.2} />
      {/* agua: del lado de entrada siempre; del lado de salida solo si está abierta */}
      <rect x={4} y={27} width={24} height={10} rx={2} fill={color} opacity={0.4} />
      <rect
        x={36}
        y={27}
        width={24}
        height={10}
        rx={2}
        fill={color}
        opacity={0.4}
        style={{ transform: `scaleX(${on ? 1 : 0})`, transformOrigin: "36px 32px", transition: "transform 600ms ease-out" }}
      />
      {on && (
        <line x1={6} x2={58} y1={32} y2={32} stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="4 6">
          {animate && <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.7s" repeatCount="indefinite" />}
        </line>
      )}
      {/* bridas */}
      {[14, 50].map((x) => (
        <rect key={x} x={x - 2} y={22} width={4} height={20} rx={1.5} fill={c} opacity={0.75} />
      ))}
      {/* cuerpo + palanca: alineada con el tubo = abierta, cruzada = cerrada */}
      <circle cx={32} cy={32} r={9.5} fill="#fff" stroke={c} strokeWidth={2.6} />
      <g style={{ transform: `rotate(${on ? 0 : 90}deg)`, transformOrigin: "32px 32px", transition: "transform 500ms cubic-bezier(.3,1.4,.5,1)" }}>
        <rect x={15} y={29.5} width={34} height={5} rx={2.5} fill={c} />
        <circle cx={48} cy={32} r={3.4} fill={c} />
      </g>
      <circle cx={32} cy={32} r={3.2} fill="#fff" stroke={c} strokeWidth={1.6} />
    </g>
  );
}

function Heater({ on, color, animate }: ArtProps) {
  const id = useUid();
  const c = on ? color : OFF;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      {/* ondas de calor */}
      {on && (
        <g stroke={color} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" fill="none">
          {[18, 32, 46].map((x, i) => (
            <path key={x} d={`M${x} 14 q-3 -4 0 -8 q3 -4 0 -8`} transform="translate(0 10)">
              {animate && <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
              {animate && <animateTransform attributeName="transform" type="translate" values="0 14;0 4" dur="1.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
            </path>
          ))}
        </g>
      )}
      {on && <rect x={10} y={22} width={44} height={28} rx={8} fill={color} opacity={0.5} filter={`url(#${id}b)`} />}
      <rect x={8} y={20} width={48} height={32} rx={8} fill="#fff" stroke={c} strokeOpacity={0.7} strokeWidth={2.6} />
      {/* resistencias */}
      {[27, 33, 39, 45].map((y) => (
        <path
          key={y}
          d={`M14 ${y} h4 l2 -3 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l2 3 h4`}
          fill="none"
          stroke={on ? `url(#${id}g)` : OFF}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={on ? 1 : 0.7}
        />
      ))}
      {/* patas */}
      <rect x={13} y={52} width={6} height={6} rx={2} fill={c} opacity={0.6} />
      <rect x={45} y={52} width={6} height={6} rx={2} fill={c} opacity={0.6} />
      {/* piloto */}
      <circle cx={50} cy={25} r={2.2} fill={on ? "#fde047" : OFF}>
        {on && animate && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
      </circle>
    </g>
  );
}

function Light({ on, color, animate }: ArtProps) {
  const id = useUid();
  const c = on ? color : OFF;
  const bulb = "M32 6 C20 6 14 15 14 24 C14 31 19 35 22 40 C23 42 23 44 23 46 H41 C41 44 41 42 42 40 C45 35 50 31 50 24 C50 15 44 6 32 6 Z";
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor={color} />
        </radialGradient>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {on && <circle cx={32} cy={25} r={27} fill={color} opacity={0.35} filter={`url(#${id}b)`} />}
      {/* rayos */}
      {on && (
        <g stroke={color} strokeWidth={2.4} strokeLinecap="round">
          {[-70, -35, 0, 35, 70].map((a) => (
            <line key={a} x1={32} y1={1} x2={32} y2={-3.5} transform={`rotate(${a} 32 25)`}>
              {animate && <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />}
            </line>
          ))}
        </g>
      )}
      <path d={bulb} fill={on ? `url(#${id}g)` : "#fff"} stroke={c} strokeOpacity={on ? 0.9 : 0.6} strokeWidth={2.4} strokeLinejoin="round" style={{ transition: "fill 400ms" }} />
      {/* filamento */}
      <path d="M26 46 V33 l3 -4 l3 4 l3 -4 l3 4 V46" fill="none" stroke={on ? "#fff" : OFF} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* casquillo */}
      <rect x={23} y={46} width={18} height={4.5} rx={2} fill={c} />
      <rect x={24} y={51} width={16} height={4.5} rx={2} fill={c} opacity={0.85} />
      <path d="M27 56 h10 l-1.5 4 h-7 Z" fill={c} opacity={0.7} />
      <path d="M21 17 C22 13 25 11 28 10" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.75} />
    </g>
  );
}

function Cooler({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  const arm = (
    <g>
      <line x1={32} y1={32} x2={32} y2={6} />
      <path d="M32 13 l-5 -4 M32 13 l5 -4" />
      <path d="M32 21 l-4 -3.5 M32 21 l4 -3.5" />
    </g>
  );
  return (
    <g>
      <circle cx={32} cy={32} r={28} fill={c} opacity={on ? 0.1 : 0.05} />
      <g stroke={c} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <g key={r} transform={`rotate(${r} 32 32)`}>
            {arm}
          </g>
        ))}
        {on && animate && <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="14s" repeatCount="indefinite" />}
      </g>
      <circle cx={32} cy={32} r={4.6} fill="#fff" stroke={c} strokeWidth={2.2} />
      {on &&
        [[12, 14], [52, 50], [50, 12]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.8} fill={color} opacity={0.6}>
            {animate && <animate attributeName="opacity" values="0;0.9;0" dur="2s" begin={`${i * 0.6}s`} repeatCount="indefinite" />}
          </circle>
        ))}
    </g>
  );
}

function Curtain({ on, color }: ArtProps) {
  const c = on ? color : OFF;
  // Encendido = cortina extendida (cubre); apagado = recogida a los lados.
  const tr = "transform 700ms cubic-bezier(.3,.9,.3,1)";
  const panel = (x: number, origin: number, flip: boolean) => (
    <g style={{ transform: `scaleX(${on ? 1 : 0.3})`, transformOrigin: `${origin}px 30px`, transition: tr }}>
      <rect x={x} y={13} width={26} height={44} rx={2} fill={c} opacity={on ? 0.28 : 0.35} />
      {[4, 9, 14, 19, 24].map((dx) => (
        <line key={dx} x1={flip ? x + 26 - dx : x + dx} x2={flip ? x + 26 - dx : x + dx} y1={14} y2={56} stroke={c} strokeOpacity={0.6} strokeWidth={1.6} />
      ))}
    </g>
  );
  return (
    <g>
      {/* sol / luz que entra */}
      <circle cx={32} cy={38} r={12} fill="#fde68a" opacity={on ? 0.15 : 0.7} style={{ transition: "opacity 600ms" }} />
      <rect x={3} y={8} width={58} height={5.5} rx={2.7} fill={c} />
      {[8, 18, 28, 38, 48, 56].map((x) => (
        <circle key={x} cx={x} cy={10.7} r={1.4} fill="#fff" />
      ))}
      {panel(6, 6, false)}
      {panel(32, 58, true)}
    </g>
  );
}

function Mister({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  return (
    <g>
      {/* tubo + boquilla */}
      <rect x={6} y={6} width={52} height={6} rx={3} fill={c} opacity={0.75} />
      <rect x={28} y={12} width={8} height={7} fill={c} opacity={0.75} />
      <path d="M26 19 H38 L35 26 H29 Z" fill="#fff" stroke={c} strokeWidth={2.2} strokeLinejoin="round" />
      {on && (
        <>
          <path d="M29 27 L10 58 H54 L35 27 Z" fill={color} opacity={0.1} />
          {[-28, -16, -6, 6, 16, 28].map((a, i) => (
            <circle key={a} r={1.8} fill={color} opacity={0.75} cx={32} cy={28}>
              {animate && (
                <>
                  <animateTransform attributeName="transform" type="translate" values={`0 0; ${a * 0.85} 28`} dur={`${1.3 + (i % 3) * 0.25}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0" dur={`${1.3 + (i % 3) * 0.25}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </>
              )}
            </circle>
          ))}
          <ellipse cx={32} cy={56} rx={20} ry={4} fill={color} opacity={0.25}>
            {animate && <animate attributeName="rx" values="16;22;16" dur="2s" repeatCount="indefinite" />}
          </ellipse>
        </>
      )}
      {!on && <path d="M32 29 v4" stroke={OFF} strokeWidth={2.4} strokeLinecap="round" />}
    </g>
  );
}

function Generic({ on, color, animate }: ArtProps) {
  const c = on ? color : OFF;
  return (
    <g>
      <circle cx={32} cy={32} r={27} fill="#fff" stroke={c} strokeOpacity={0.5} strokeWidth={2.6} />
      {on && (
        <circle cx={32} cy={32} r={27} fill="none" stroke={color} strokeWidth={2}>
          {animate && <animate attributeName="r" values="27;31" dur="1.6s" repeatCount="indefinite" />}
          {animate && <animate attributeName="opacity" values="0.6;0" dur="1.6s" repeatCount="indefinite" />}
        </circle>
      )}
      <path d="M32 17 V31" stroke={c} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M22.5 22.5 A14.5 14.5 0 1 0 41.5 22.5" stroke={c} strokeWidth={4.4} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Dibuja la ilustración que corresponde al tipo. */
export function ActuatorArt({ kind, ...p }: ArtProps & { kind: ActuatorKind }) {
  switch (kind) {
    case "fan":
      return <Fan {...p} />;
    case "water_pump":
      return <WaterPump {...p} />;
    case "valve":
      return <Valve {...p} />;
    case "heater":
      return <Heater {...p} />;
    case "light":
      return <Light {...p} />;
    case "cooler":
      return <Cooler {...p} />;
    case "curtain":
      return <Curtain {...p} />;
    case "mister":
      return <Mister {...p} />;
    default:
      return <Generic {...p} />;
  }
}
