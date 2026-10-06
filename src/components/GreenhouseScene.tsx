import { memo, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Corte de un invernadero dibujado en SVG, la pieza "viva" de la app.
 *
 * - El cielo, el sol/la luna y las estrellas siguen la hora real
 *   (`hour`, 0..24). En el panel es la hora local del invernadero.
 * - La condensación del vidrio depende de la humedad real (0..100).
 * - Si hay una luz de cultivo encendida brilla en violeta; si un
 *   ventilador está encendido gira; si el riego está activo gotea.
 *   Todo sale de datos reales que se pasan como props; la escena no
 *   inventa valores.
 *
 * Las animaciones son CSS (se pausan solas con la pestaña oculta y
 * desaparecen con movimiento reducido, ver index.css).
 */

export interface SceneProps {
  hour: number;
  humidity?: number | null;
  growLight?: boolean;
  fanOn?: boolean;
  irrigating?: boolean;
  /** Calefactor encendido: resplandor cálido y ondas de calor. */
  heaterOn?: boolean;
  /** Enfriador encendido: tinte frío y corrientes de aire. */
  coolerOn?: boolean;
  /** Cortina o malla de sombra cerrada sobre el techo. */
  curtainOn?: boolean;
  /** Nebulizador encendido: neblina entre las plantas. */
  misting?: boolean;
  /** Estado de cada actuador (en orden): se ve como focos en el tablero de control. */
  actuators?: boolean[];
  /** Contenido superpuesto (etiquetas de sensores, títulos...). */
  children?: ReactNode;
  className?: string;
  /** Recorte del SVG: "slice" llena el contenedor, "meet" lo muestra completo. */
  fit?: "slice" | "meet";
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): string =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

// Paleta del cielo a lo largo del día: [hora, arriba, horizonte].
const SKY: Array<[number, string, string]> = [
  [0, "#0A1326", "#1B2742"],
  [5, "#121D3A", "#2E3558"],
  [6.5, "#5A6AA3", "#F2B58C"],
  [8.5, "#8CC2E6", "#E4F1EE"],
  [16.5, "#7DB5DE", "#E6F0E4"],
  [18.5, "#45437A", "#EE9567"],
  [20, "#18213F", "#3A3557"],
  [24, "#0A1326", "#1B2742"],
];

function skyAt(h: number) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i];
    const [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return { top: mix(hex(t0), hex(t1), t), bottom: mix(hex(b0), hex(b1), t) };
    }
  }
  return { top: SKY[0][1], bottom: SKY[0][2] };
}

/** 0 = pleno día, 1 = noche cerrada (con transición en amanecer/atardecer). */
export function nightFactor(h: number) {
  if (h >= 8 && h <= 17) return 0;
  if (h >= 20.5 || h <= 4.5) return 1;
  if (h < 8) return 1 - (h - 4.5) / 3.5;
  return (h - 17) / 3.5;
}

export function phaseLabel(h: number) {
  if (h >= 5 && h < 8) return "Amanecer";
  if (h >= 8 && h < 17) return "Día";
  if (h >= 17 && h < 20) return "Atardecer";
  return "Noche";
}

// Pseudo-aleatorio estable (misma escena en cada render).
function seeded(n: number) {
  let s = 1234567;
  return Array.from({ length: n }, () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  });
}
const RAND = seeded(200);

const STARS = Array.from({ length: 30 }, (_, i) => ({ x: RAND[i] * 800, y: RAND[i + 30], r: 0.6 + RAND[i + 60] * 1.1 }));
const CLOUDS = [
  { y: 0.18, w: 120, d: 0, dur: 70 },
  { y: 0.32, w: 80, d: -30, dur: 55 },
  { y: 0.1, w: 150, d: -50, dur: 90 },
];
// Gotas posibles sobre el vidrio (dentro del pentágono de la fachada).
const DROPS = Array.from({ length: 40 }, (_, i) => {
  const x = 185 + RAND[i + 90] * 430;
  const roofY = x < 400 ? 160 - ((x - 170) / 230) * 70 : 90 + ((x - 400) / 230) * 70;
  const y = roofY + 8 + RAND[i + 140] * (262 - roofY - 16);
  return { x, y, r: 1.2 + RAND[i + 170] * 1.8 };
});
const PLANTS = [212, 252, 292, 332, 372, 428, 468, 508, 548, 588];

function SceneSvg({
  hour,
  humidity,
  growLight,
  fanOn,
  irrigating,
  heaterOn,
  coolerOn,
  curtainOn,
  misting,
  actuators,
  fit = "slice",
  viewH = 320,
}: SceneProps & { viewH?: number }) {
  const top = 320 - viewH;
  // Ids únicos por escena: puede haber varias en la misma página.
  const uid = useId().replace(/:/g, "");
  const sky = skyAt(hour);
  const night = nightFactor(hour);
  const sunT = (hour - 6) / 13; // 6:00 → 19:00
  const moonH = hour < 12 ? hour + 24 : hour;
  const moonT = (moonH - 19) / 11; // 19:00 → 6:00
  const sun = sunT > 0 && sunT < 1 ? { x: 60 + sunT * 680, y: 230 - Math.sin(Math.PI * sunT) * 175 } : null;
  const moon = moonT > 0 && moonT < 1 ? { x: 60 + moonT * 680, y: 220 - Math.sin(Math.PI * moonT) * 150 } : null;
  const hum = humidity == null ? 0.25 : Math.max(0, Math.min(1, humidity / 100));
  const drops = DROPS.slice(0, Math.round(hum * DROPS.length));
  const hills = mix(hex("#5E9A62"), hex("#16261D"), night);
  const hillsFar = mix(hex("#8DBB8C"), hex("#1C2E2A"), night);
  const ground = mix(hex("#6E8F4E"), hex("#18241A"), night);
  const frame = mix(hex("#F3F7F2"), hex("#9FB3A8"), night);

  const swayStyle = (i: number) => ({
    transformBox: "fill-box" as const,
    transformOrigin: "50% 100%",
    animationDelay: `${-i * 0.37}s`,
    animationDuration: `${5 + (i % 3)}s`,
  });

  return (
    <svg
      viewBox={`0 ${top} 800 ${viewH}`}
      preserveAspectRatio={fit === "slice" ? "xMidYMax slice" : "xMidYMid meet"}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`gh-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.top} style={{ transition: "stop-color 2s" }} />
          <stop offset="100%" stopColor={sky.bottom} style={{ transition: "stop-color 2s" }} />
        </linearGradient>
        <radialGradient id={`gh-sun-${uid}`}>
          <stop offset="0%" stopColor="#FFF4C9" />
          <stop offset="45%" stopColor="#F5C94E" />
          <stop offset="100%" stopColor="#F5C94E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`gh-heat-${uid}`} cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#FF9A3D" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FF7A2F" stopOpacity="0" />
        </radialGradient>
        <pattern id={`gh-mesh-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#1F3A2B" opacity="0.55" />
          <path d="M0 0L8 8M8 0L0 8" stroke="#0E1F16" strokeWidth="0.8" opacity="0.6" />
        </pattern>
        <radialGradient id={`gh-grow-${uid}`} cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#E28BEF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#C86BD8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`gh-glass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#E8F4F8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`gh-sheen-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`gh-house-${uid}`}>
          <path d="M170 270V160L400 90L630 160V270Z" />
        </clipPath>
      </defs>

      {/* Cielo */}
      <rect y={top} width="800" height={viewH} fill={`url(#gh-sky-${uid})`} />
      <g opacity={night}>
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={top + s.y * (150 - top)}
            r={s.r}
            fill="#fff"
            className={i % 3 === 0 ? "animate-flicker" : undefined}
            style={{ animationDelay: `${-i * 0.4}s` }}
          />
        ))}
      </g>
      {sun && (
        <g>
          <circle cx={sun.x} cy={sun.y} r="46" fill={`url(#gh-sun-${uid})`} opacity={0.9} />
          <circle cx={sun.x} cy={sun.y} r="15" fill="#FFE58A" />
        </g>
      )}
      {moon && (
        <g opacity={Math.max(0.35, night)}>
          <circle cx={moon.x} cy={moon.y} r="13" fill="#EEF1E6" />
          <circle cx={moon.x + 5} cy={moon.y - 3} r="11" fill={sky.top} />
        </g>
      )}

      {/* Nubes de día */}
      <g opacity={(1 - night) * 0.85}>
        {CLOUDS.map((c, i) => (
          <g key={i} className="animate-drift" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.d}s`, transformBox: "view-box" }}>
            <ellipse cx="0" cy={top + c.y * (200 - top)} rx={c.w / 2} ry={c.w / 7} fill="#fff" opacity="0.75" />
            <ellipse cx={c.w * 0.15} cy={top + c.y * (200 - top) - c.w / 9} rx={c.w / 4} ry={c.w / 6} fill="#fff" opacity="0.75" />
          </g>
        ))}
      </g>

      {/* Colinas y suelo */}
      <path d="M0 236 C120 200 230 214 330 226 C450 240 560 196 800 212 V320 H0Z" fill={hillsFar} />
      <path d="M0 252 C140 232 260 246 390 250 C520 254 640 232 800 244 V320 H0Z" fill={hills} />
      <rect y="268" width="800" height="52" fill={ground} />
      <path d="M0 268 H800" stroke="#000" strokeOpacity="0.12" />

      {/* Interior del invernadero */}
      <g clipPath={`url(#gh-house-${uid})`}>
        <rect x="170" y="80" width="460" height="190" fill="#DCEFE3" opacity={0.22 - night * 0.12} />
        {/* Mesa de cultivo */}
        <rect x="190" y="236" width="420" height="7" rx="2" fill="#7A5A3C" />
        <rect x="204" y="243" width="5" height="27" fill="#6A4C31" />
        <rect x="591" y="243" width="5" height="27" fill="#6A4C31" />
        {/* Plantas en macetas */}
        {PLANTS.map((x, i) => {
          const h = 26 + ((i * 7) % 4) * 7;
          return (
            <g key={x}>
              <path d={`M${x - 10} 222 h20 l-3 14 h-14z`} fill="#C46A3F" />
              <g className="animate-sway" style={swayStyle(i)}>
                <path d={`M${x} 222 V${222 - h}`} stroke="#2F7E48" strokeWidth="2.4" strokeLinecap="round" />
                <path d={`M${x} ${222 - h * 0.45} c-11 0 -17 -6 -18 -15 c10 0 16 5 18 15z`} fill="#4F9A60" />
                <path d={`M${x} ${222 - h * 0.7} c11 0 17 -6 18 -15 c-10 0 -16 5 -18 15z`} fill="#5DAA72" />
                <circle cx={x} cy={222 - h} r="4.5" fill={i % 3 === 0 ? "#E5554B" : "#80BB8C"} />
              </g>
            </g>
          );
        })}

        {/* Riego por goteo */}
        <path d="M190 178 H610" stroke="#2B7A9B" strokeWidth="2.5" opacity={irrigating ? 0.9 : 0.35} />
        {irrigating &&
          PLANTS.map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy="182"
              r="2.2"
              fill="#5BB4D9"
              className="animate-drip"
              style={{ animationDelay: `${(i % 5) * 0.26}s` }}
            />
          ))}
      </g>

      {/* Calefactor: resplandor cálido desde el piso y ondas de calor */}
      {heaterOn && (
        <g clipPath={`url(#gh-house-${uid})`}>
          <rect x="170" y="150" width="460" height="120" fill={`url(#gh-heat-${uid})`} className="animate-flicker" style={{ animationDuration: "3.5s" }} />
          {[250, 330, 410, 490, 570].map((x, i) => (
            <path
              key={x}
              d={`M${x} 232 c-6 -8 6 -14 0 -22 c-6 -8 6 -14 0 -22`}
              fill="none"
              stroke="#FFB067"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-heat"
              style={{ animationDelay: `${i * 0.45}s`, transformBox: "view-box" }}
            />
          ))}
        </g>
      )}
      {/* Unidad del calefactor, encendida */}
      {heaterOn && (
        <g transform="translate(540 250)">
          <rect width="46" height="18" rx="3" fill="#7A3A1C" />
          {[6, 14, 22, 30, 38].map((x) => (
            <rect key={x} x={x} y="3" width="3" height="12" rx="1.5" fill="#FF9A3D" />
          ))}
        </g>
      )}

      {/* Enfriador: tinte frío y corrientes de aire */}
      {coolerOn && (
        <g clipPath={`url(#gh-house-${uid})`}>
          <rect x="170" y="80" width="460" height="190" fill="#8FD3F5" opacity="0.16" />
          {[165, 195, 222].map((y, i) => (
            <path
              key={y}
              d={`M260 ${y} q40 -10 80 0 t80 0 t80 0`}
              fill="none"
              stroke="#CFEFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="14 10"
              className="animate-breeze"
              style={{ animationDelay: `${i * 0.6}s`, transformBox: "view-box" }}
            />
          ))}
        </g>
      )}

      {/* Nebulizador: neblina entre las plantas */}
      {misting && (
        <g clipPath={`url(#gh-house-${uid})`}>
          {[230, 320, 410, 500, 580].map((x, i) => (
            <ellipse
              key={x}
              cx={x}
              cy={200 + (i % 2) * 14}
              rx="58"
              ry="16"
              fill="#F2FAFF"
              className="animate-mist"
              style={{ animationDelay: `${-i * 1.1}s`, transformBox: "fill-box", transformOrigin: "center" }}
            />
          ))}
        </g>
      )}

      {/* La noche oscurece el interior… */}
      <path d="M170 270V160L400 90L630 160V270Z" fill="#081022" opacity={night * 0.4} />

      {/* …salvo que esté prendida la luz de cultivo */}
      {growLight && (
        <g clipPath={`url(#gh-house-${uid})`}>
          <rect x="170" y="80" width="460" height="190" fill={`url(#gh-grow-${uid})`} opacity={0.45 + night * 0.4} />
          <rect x="240" y="150" width="320" height="5" rx="2.5" fill="#F3C7FA" />
          <rect x="240" y="150" width="320" height="5" rx="2.5" fill="#E28BEF" className="animate-flicker" style={{ animationDuration: "4s" }} />
        </g>
      )}

      {/* Vidrio, estructura y destello */}
      <path d="M170 270V160L400 90L630 160V270Z" fill={`url(#gh-glass-${uid})`} />
      <g clipPath={`url(#gh-house-${uid})`}>
        <rect x="170" y="80" width="200" height="200" fill={`url(#gh-sheen-${uid})`} className="animate-sheen" style={{ transformBox: "view-box" }} />
        {drops.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity="0.55" />
            {i % 7 === 0 && (
              <circle
                cx={d.x}
                cy={d.y}
                r={d.r * 0.8}
                fill="#fff"
                opacity="0.7"
                className="animate-trickle"
                style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${7 + (i % 4)}s` }}
              />
            )}
          </g>
        ))}
      </g>
      <g stroke={frame} strokeWidth="3" fill="none" strokeLinejoin="round" opacity="0.92">
        <path d="M170 270V160L400 90L630 160V270" />
        <path d="M170 205H630" strokeWidth="2" />
        {[216, 262, 308, 354, 446, 492, 538, 584].map((x) => {
          const top = x < 400 ? 160 - ((x - 170) / 230) * 70 : 90 + ((x - 400) / 230) * 70;
          return <path key={x} d={`M${x} 270V${top}`} strokeWidth="1.6" />;
        })}
        <path d="M400 90V270" strokeWidth="2" />
      </g>

      {/* Cortina / malla de sombra: baja sobre el techo al cerrarse */}
      <g clipPath={`url(#gh-house-${uid})`}>
        <rect
          x="170"
          y="88"
          width="460"
          height="78"
          fill={`url(#gh-mesh-${uid})`}
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 0%",
            transform: curtainOn ? "scaleY(1)" : "scaleY(0)",
            transition: "transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </g>

      {/* Tablero de control: un foco por actuador (verde = encendido) */}
      {actuators && actuators.length > 0 && (
        <g transform="translate(640 206)">
          <rect width="24" height={12 + Math.min(actuators.length, 6) * 9} rx="3" fill="#22382C" stroke={frame} strokeWidth="1.5" />
          {actuators.slice(0, 6).map((on, i) => (
            <g key={i}>
              {on && (
                <circle cx="12" cy={10 + i * 9} r="5.5" fill="#7CFFA0" opacity="0.35" className="animate-flicker" style={{ animationDelay: `${-i * 0.5}s` }} />
              )}
              <circle cx="12" cy={10 + i * 9} r="2.8" fill={on ? "#7CFFA0" : "#53635A"} />
            </g>
          ))}
        </g>
      )}

      {/* Ventilador en el frontón */}
      <g transform="translate(400 132)">
        <circle r="17" fill="#22382C" stroke={frame} strokeWidth="2.5" />
        <g className={fanOn ? "animate-spin-slow" : undefined} style={{ transformBox: "fill-box", transformOrigin: "center", animationDuration: "1.1s" }}>
          {[0, 120, 240].map((a) => (
            <path key={a} d="M0 0 C3 -6 9 -11 2 -14 C-3 -11 -3 -5 0 0Z" fill="#B2D7B9" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="2.5" fill={frame} />
      </g>
    </svg>
  );
}

const MemoScene = memo(SceneSvg);

export function GreenhouseScene(props: SceneProps) {
  const { children, className = "" } = props;
  // En contenedores altos (login en escritorio, celular) se "agranda" el
  // cielo hacia arriba en vez de hacer zoom al invernadero.
  const ref = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (!width || !height) return;
      // En pantallas angostas conviene acercar (recortando los lados) en vez de alejar.
      if (width < 640) setViewH(360);
      else setViewH(Math.round(Math.min(560, Math.max(320, (800 * height) / width))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative isolate overflow-hidden ${className}`}>
      <MemoScene {...props} viewH={viewH} />
      {children}
    </div>
  );
}

/** Hora decimal (0..24) en una zona horaria IANA, actualizada cada minuto. */
export function useLocalHour(timeZone?: string) {
  const read = () => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone || undefined,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
      const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      return h + m / 60;
    } catch {
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60;
    }
  };
  const [hour, setHour] = useState(read);
  useEffect(() => {
    setHour(read());
    const t = window.setInterval(() => setHour(read()), 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeZone]);
  return hour;
}

export function formatHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}
