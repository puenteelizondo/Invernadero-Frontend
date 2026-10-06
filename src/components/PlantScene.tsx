import { useId, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Atom, CheckCircle2, Droplets, FlaskConical, Minus, Plus, Sprout, Sun, Thermometer, Wind, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { evaluate, lookFor, LEVEL_TEXT, type Level, type PlantLook, type VarInput, type VarKey, type VarState } from "../lib/plant";

type IconType = ComponentType<{ className?: string }>;

const META: Record<VarKey, { label: string; icon: IconType; missing: string }> = {
  temperature: { label: "Temperatura", icon: Thermometer, missing: "Sin sensor de temperatura" },
  humidity: { label: "Humedad del aire", icon: Droplets, missing: "Sin sensor de humedad" },
  light: { label: "Luz", icon: Sun, missing: "Sin sensor de luz" },
  soil: { label: "Humedad del suelo", icon: Sprout, missing: "Sin sensor de suelo" },
  co2: { label: "CO₂", icon: Atom, missing: "Sin sensor de CO₂" },
  ph: { label: "pH", icon: FlaskConical, missing: "Sin sensor de pH" },
  ec: { label: "Conductividad (EC)", icon: Zap, missing: "Sin sensor de EC" },
  wind: { label: "Viento", icon: Wind, missing: "Sin sensor de viento" },
};

const LEFT: VarKey[] = ["temperature", "humidity", "co2", "ph"];
const RIGHT: VarKey[] = ["light", "soil", "wind", "ec"];

// Transición común: las hojas "se asientan" con la misma curva suave de toda la app.
const T = "transform 1.6s cubic-bezier(.22,1,.36,1), fill 1.4s ease, opacity 1.2s ease, stroke 1.2s ease";

const LEAF = "M0 0 C18 -26 62 -30 98 -4 C66 20 22 22 0 0 Z";
const VEIN = "M5 0 C34 -5 64 -7 92 -4";
const TIP = "M64 -17 C78 -15 91 -10 98 -4 C88 6 76 12 64 15 C71 6 71 -6 64 -17 Z";
const DOME = "M32 358 V170 C32 78 124 28 240 28 C356 28 448 78 448 170 V358 Z";

const LEAVES = [
  { y: 50, len: 1, up: 26 },
  { y: 96, len: 0.92, up: 34 },
  { y: 138, len: 0.8, up: 42 },
  { y: 172, len: 0.62, up: 52 },
];

const CO2 = [
  { x: 74, y: 120, dx: 120, dy: 70 }, { x: 410, y: 140, dx: -120, dy: 60 }, { x: 120, y: 230, dx: 80, dy: -10 },
  { x: 380, y: 250, dx: -80, dy: -20 }, { x: 90, y: 300, dx: 110, dy: -50 }, { x: 395, y: 90, dx: -110, dy: 100 },
  { x: 160, y: 70, dx: 60, dy: 120 }, { x: 330, y: 70, dx: -60, dy: 125 }, { x: 60, y: 200, dx: 140, dy: 10 }, { x: 430, y: 215, dx: -140, dy: 5 },
];

const DROPS = [[40, 120], [62, 200], [418, 150], [394, 230], [96, 70], [380, 80], [52, 270], [428, 280]];

function Leaf({ side, spec, i, look }: { side: 1 | -1; spec: (typeof LEAVES)[number]; i: number; look: PlantLook }) {
  const angle = Math.max(-35, spec.up + look.leafUp - look.wiltDrop * (0.65 + i * 0.12));
  const sx = spec.len * (side === -1 ? 0.95 : 1);
  const sy = sx * (1 - look.leafCurl * 0.45);
  const y = (spec.y + (side === -1 ? 9 : 0)) * look.stretch;
  return (
    <g style={{ transform: `translate(0px, ${-y}px)`, transition: T }}>
      <g style={{ transform: `scale(${side}, 1)` }}>
        <g style={{ transformOrigin: "0 0", transform: `rotate(${-angle}deg) scale(${sx}, ${sy})`, transition: T }}>
          <path d={LEAF} style={{ fill: look.leafFill, stroke: look.leafVein, transition: T }} strokeWidth={1.4} strokeLinejoin="round" />
          <path d={VEIN} fill="none" style={{ stroke: look.leafVein, transition: T }} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
          {/* puntas tostadas por el calor */}
          <path d={TIP} fill="#9a5a22" style={{ opacity: look.heat * 0.8, transition: T }} />
          {/* brillo de hoja mojada */}
          <path d="M14 -6 C34 -14 58 -14 80 -8" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" style={{ opacity: look.wet * 0.55, transition: T }} />
          {/* gotitas por humedad alta */}
          <g style={{ opacity: look.wet, transition: T }}>
            <circle cx={42} cy={-7} r={2.6} fill="#cfeaff" stroke="#fff" strokeWidth={0.8} />
            <circle cx={68} cy={-2} r={2.2} fill="#cfeaff" stroke="#fff" strokeWidth={0.8} />
            <circle cx={30} cy={6} r={1.9} fill="#cfeaff" stroke="#fff" strokeWidth={0.8} />
          </g>
          {/* escarcha por frío */}
          <g style={{ opacity: look.cold, transition: T }} fill="#fff">
            <circle cx={30} cy={-10} r={2.1} /><circle cx={56} cy={-7} r={1.8} /><circle cx={78} cy={-2} r={2} /><circle cx={44} cy={7} r={1.7} /><circle cx={64} cy={9} r={1.5} />
          </g>
        </g>
      </g>
    </g>
  );
}

function PlantSvg({ look, label }: { look: PlantLook; label: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${uid}`;
  const top = 190 * look.stretch;
  const nCo2 = Math.round(look.co2 * CO2.length);
  const nDrops = Math.round(look.wet * DROPS.length);
  const sway = 0.5 + look.wind * 3.6;

  return (
    <svg viewBox="0 0 480 380" role="img" aria-label={label} className="h-auto w-full select-none">
      <defs>
        <linearGradient id={id("glass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-brand-100))" stopOpacity={0.9} />
          <stop offset="100%" stopColor="rgb(var(--c-brand-50))" stopOpacity={0.55} />
        </linearGradient>
        <radialGradient id={id("heat")} cx="50%" cy="22%" r="75%">
          <stop offset="0%" stopColor="#ff9a3c" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ff6a2c" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id("frost")}>
          <stop offset="0%" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#dff1ff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id("pot")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b85a36" />
          <stop offset="55%" stopColor="#d27549" />
          <stop offset="100%" stopColor="#a44e2e" />
        </linearGradient>
        <clipPath id={id("dome")}>
          <path d={DOME} />
        </clipPath>
      </defs>

      {/* cúpula de cristal */}
      <path d={DOME} fill={`url(#${id("glass")})`} />

      <g clipPath={`url(#${id("dome")})`}>
        {/* poca luz: el ambiente se apaga */}
        <rect x={0} y={0} width={480} height={380} fill="#0d2418" style={{ opacity: look.dim * 0.3, transition: T }} />
        {/* calor: resplandor naranja */}
        <rect x={0} y={0} width={480} height={380} fill={`url(#${id("heat")})`} style={{ opacity: look.heat, transition: T }} />
        {/* frío: tinte azul */}
        <rect x={0} y={0} width={480} height={380} fill="#8ec5ff" style={{ opacity: look.cold * 0.2, transition: T }} />

        {/* luz fuerte: sol y rayos */}
        <circle cx={92} cy={84} r={20} fill="#ffd36b" style={{ opacity: 0.18 + look.sunny * 0.82, transition: T }} />
        <g className="animate-ray-pulse" style={{ ["--ray" as string]: look.sunny * 0.5 }} fill="#ffe08a">
          <polygon points="92,84 20,200 70,230" /><polygon points="92,84 90,250 150,250" />
          <polygon points="92,84 180,170 230,240" /><polygon points="92,84 40,60 20,120" />
        </g>

        {/* marco de la nave */}
        <g fill="none" stroke="rgb(var(--c-brand-300))" strokeWidth={1.2} opacity={0.55}>
          <path d="M140 38 V358 M240 28 V358 M340 38 V358 M32 150 H448 M52 96 H428" />
        </g>

        {/* niebla por humedad alta */}
        <g style={{ opacity: look.wet * 0.75, transition: T }}>
          <ellipse className="animate-mist" cx={160} cy={250} rx={110} ry={28} fill="#fff" opacity={0.35} />
          <ellipse className="animate-mist" style={{ animationDelay: "-3s" }} cx={330} cy={210} rx={120} ry={26} fill="#fff" opacity={0.3} />
        </g>

        {/* viento */}
        <g style={{ opacity: look.wind > 0.15 ? look.wind : 0, transition: T }} fill="none" stroke="rgb(var(--c-neutral-400))" strokeWidth={2} strokeLinecap="round">
          <path className="animate-breeze" d="M56 150 h60" /><path className="animate-breeze" style={{ animationDelay: "-1.2s" }} d="M70 176 h90" /><path className="animate-breeze" style={{ animationDelay: "-2.2s" }} d="M40 204 h50" />
        </g>

        {/* CO₂: partículas que la planta "absorbe" */}
        {CO2.map((p, i) => (
          <g key={i} style={{ opacity: i < nCo2 ? 1 : 0, transition: T }}>
            <g transform={`translate(${p.x} ${p.y})`}>
              <g className="animate-co2-in" style={{ ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, animationDelay: `${-i * 0.45}s` }}>
                <circle r={4.5} fill="#8fb5d6" stroke="#fff" strokeWidth={0.8} />
                {i < 3 && <text y={2.6} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="#1c3550">CO₂</text>}
              </g>
            </g>
          </g>
        ))}

        {/* ondas de calor */}
        <g style={{ opacity: look.heat, transition: T }} fill="none" stroke="#ff8f3d" strokeWidth={2.4} strokeLinecap="round">
          {[200, 240, 280].map((x, i) => (
            <path key={x} className="animate-wave" style={{ animationDelay: `${-i * 0.9}s` }} d={`M${x} 118 q7 -9 14 0 t14 0`} />
          ))}
        </g>

        {/* condensación en el cristal */}
        <g style={{ opacity: look.wet, transition: T }}>
          {DROPS.map(([x, y], i) => (
            <g key={i} style={{ opacity: i < nDrops ? 1 : 0, transition: T }}>
              <circle cx={x} cy={y} r={3.4} fill="#e8f5ff" stroke="#fff" strokeWidth={1} opacity={0.9} />
              {i % 3 === 0 && look.wet > 0.3 && <circle className="animate-drip" style={{ animationDelay: `${-i * 0.35}s` }} cx={x} cy={y + 4} r={2} fill="#cfeaff" />}
            </g>
          ))}
        </g>

        {/* escarcha en el cristal */}
        <g style={{ opacity: look.cold, transition: T }}>
          <circle cx={56} cy={330} r={95} fill={`url(#${id("frost")})`} />
          <circle cx={424} cy={330} r={95} fill={`url(#${id("frost")})`} />
          <circle cx={240} cy={40} r={80} fill={`url(#${id("frost")})`} />
        </g>

        {/* la planta; todo el follaje se mece con el viento */}
        <g transform="translate(240 298)">
          <g className="animate-plant-sway" style={{ transformOrigin: "0 0", ["--sway" as string]: `${sway}deg`, ["--sway-dur" as string]: `${5.2 - look.wind * 2.8}s` }}>
            <g style={{ transform: `scaleY(${look.stretch})`, transformOrigin: "0 0", transition: T }}>
              <path d="M-6 8 L6 8 L3 -190 L-3 -190 Z" fill="#2f7a45" />
            </g>
            {LEAVES.map((spec, i) => (
              <g key={i}>
                <Leaf side={-1} spec={spec} i={i} look={look} />
                <Leaf side={1} spec={spec} i={i} look={look} />
              </g>
            ))}
            {/* yema; florece cuando todo lo que se mide está en su punto */}
            <g style={{ transform: `translate(0px, ${-top - 2}px)`, transition: T }}>
              <ellipse cx={0} cy={-2} rx={7} ry={11} fill="#3f9b57" style={{ opacity: look.allIdeal ? 0 : 1, transition: T }} />
              <g style={{ transform: `scale(${look.allIdeal ? 1 : 0.1})`, transformOrigin: "0 0", opacity: look.allIdeal ? 1 : 0, transition: T }}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx={0} cy={-13} rx={7} ry={11} fill="#f48fb1" transform={`rotate(${a})`} />
                ))}
                <circle r={6} fill="#ffd54f" />
              </g>
              {look.allIdeal && [[-22, -26], [20, -30], [26, -6]].map(([x, y], i) => (
                <path key={i} className="animate-sparkle" style={{ animationDelay: `${-i * 0.7}s`, transformOrigin: `${x}px ${y}px` }} d={`M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6} Z`} fill="#ffe082" />
              ))}
            </g>
          </g>
        </g>

        {/* maceta y tierra */}
        <path d="M170 300 H310 L298 358 H182 Z" fill={`url(#${id("pot")})`} />
        <rect x={163} y={290} width={154} height={14} rx={5} fill="#c76b43" />
        <ellipse cx={240} cy={296} rx={72} ry={10} style={{ fill: look.soilFill, transition: T }} />
        <ellipse cx={240} cy={296} rx={72} ry={10} fill={look.soilTint} style={{ opacity: look.soilTintOpacity, transition: T }} />
        <ellipse cx={226} cy={293.5} rx={26} ry={3} fill="#fff" style={{ opacity: look.soilWet * 0.35, transition: T }} />
        <g style={{ opacity: look.soilDry, transition: T }} fill="none" stroke="#3a2616" strokeWidth={1.4} strokeLinecap="round">
          <path d="M196 296 l11 4 l-4 5 M262 295 l13 3 l-3 6 M236 300 l-2 6 l7 3 M218 292 l-8 -2" />
        </g>
        <g style={{ opacity: look.salty, transition: T }} fill="#fff">
          <circle cx={206} cy={297} r={1.5} /><circle cx={250} cy={293} r={1.7} /><circle cx={272} cy={298} r={1.4} /><circle cx={232} cy={299} r={1.3} />
        </g>
        <rect x={140} y={358} width={200} height={7} rx={3} fill="rgb(var(--c-neutral-300))" />
      </g>

      {/* contorno de la cúpula */}
      <path d={DOME} fill="none" stroke="rgb(var(--c-brand-400))" strokeWidth={2.4} />
    </svg>
  );
}

// ---- etiquetas (callouts) -----------------------------------------------------
const LEVEL_UI: Record<Level, { icon: IconType; cls: string }> = {
  ideal: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  high: { icon: ArrowUp, cls: "border-amber-300 bg-amber-50 text-amber-700" },
  low: { icon: ArrowDown, cls: "border-sky-300 bg-sky-50 text-sky-700" },
  unknown: { icon: Minus, cls: "border-neutral-200 bg-neutral-100 text-neutral-600" },
};

function fmtNum(n: number | null | undefined) {
  if (n == null) return "";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function VarChip({ s }: { s: VarState }) {
  const m = META[s.key];
  const Icon = m.icon;
  const ui = LEVEL_UI[s.level];
  const LevelIcon = ui.icon;
  const hasBar = s.min != null && s.max != null && s.max > s.min;
  const spPos = hasBar && s.setpoint != null ? Math.min(1, Math.max(0, (s.setpoint - (s.min as number)) / ((s.max as number) - (s.min as number)))) : null;
  return (
    <li className="rounded-2xl border border-neutral-200/80 bg-surface p-3 shadow-pane">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-700">
          <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <span>{m.label}</span>
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${ui.cls}`}>
          <LevelIcon className="h-3 w-3" aria-hidden /> {LEVEL_TEXT[s.level]}
        </span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-semibold leading-none text-neutral-900">
        <AnimatedNumber value={s.value} />
        {s.value != null && s.unit && <span className="ml-1 text-sm font-medium text-neutral-500">{s.unit}</span>}
      </p>
      {hasBar && (
        <div className="relative mt-2.5 h-1.5 rounded-full bg-neutral-200" aria-hidden>
          {s.reference === "range" && <span className="absolute inset-y-0 left-1/3 w-1/3 rounded-full bg-emerald-300/70" />}
          {spPos != null && <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-brand-700" style={{ left: `${spPos * 100}%` }} />}
          {s.pos != null && (
            <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand-600 shadow transition-[left] duration-700 ease-leaf" style={{ left: `${s.pos * 100}%` }} />
          )}
        </div>
      )}
      <p className="mt-1.5 text-[11px] leading-snug text-neutral-500">
        {s.reference === "setpoint" ? `Comparado con tu setpoint de ${fmtNum(s.setpoint)} ${s.unit}` : s.reference === "range" ? `Comparado con el rango del sensor (${fmtNum(s.min)}–${fmtNum(s.max)} ${s.unit})` : "Sin setpoint ni rango válido: la planta no reacciona a esta variable"}
      </p>
    </li>
  );
}

function MissingChip({ k, to }: { k: VarKey; to: string }) {
  const m = META[k];
  const Icon = m.icon;
  return (
    <li className="rounded-2xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">
      <span className="flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4" aria-hidden /> {m.label}
      </span>
      <Link to={to} className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
        <Plus className="h-3 w-3" aria-hidden /> {m.missing}. Agregar
      </Link>
    </li>
  );
}

/**
 * La planta viva: una ilustración SVG original que cambia con las lecturas REALES de los sensores
 * (humedad, temperatura, luz, suelo, CO₂, pH/EC y viento). Las transiciones son CSS, así que quedan
 * quietas solas cuando el usuario/sistema pide menos movimiento (ver index.css).
 */
export function PlantScene({ vars, sensorsHref }: { vars: Partial<Record<VarKey, VarInput>>; sensorsHref: string }) {
  const states = useMemo(() => {
    const out: Partial<Record<VarKey, VarState>> = {};
    for (const [k, v] of Object.entries(vars) as [VarKey, VarInput][]) out[k] = evaluate(v);
    return out;
  }, [vars]);
  const look = useMemo(() => lookFor(states), [states]);

  const summary = (Object.values(states) as VarState[])
    .map((s) => `${META[s.key].label}: ${s.value == null ? "sin dato" : LEVEL_TEXT[s.level].toLowerCase()}`)
    .join(". ");
  const label = summary ? `Planta en su invernadero. ${summary}.` : "Planta en su invernadero. Aún no hay sensores conectados.";

  const column = (keys: VarKey[]) =>
    keys.map((k) => (states[k] ? <VarChip key={k} s={states[k] as VarState} /> : <MissingChip key={k} k={k} to={sensorsHref} />));

  return (
    <section aria-label="Planta del invernadero" className="mb-6 overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-surface/80 p-4 shadow-pane sm:p-6">
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,440px)_minmax(0,1fr)]">
        <ul className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">{column(LEFT)}</ul>
        <div className="order-1 mx-auto w-full max-w-[440px] lg:order-2">
          <PlantSvg look={look} label={label} />
          <p className="mt-1 text-center text-xs text-neutral-500">
            {look.allIdeal ? "Todo lo que se mide está en su punto: la planta floreció." : "La planta cambia con las lecturas en vivo de tus sensores."}
          </p>
        </div>
        <ul className="order-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{column(RIGHT)}</ul>
      </div>
      <p className="sr-only" aria-live="polite">{summary}</p>
    </section>
  );
}
