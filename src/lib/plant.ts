/**
 * Lógica (sin dibujo) de la planta viva: convierte las lecturas REALES de los
 * sensores en "qué tan lejos de lo ideal" está cada variable.
 *
 * Referencia de "alto" y "bajo", sin inventar valores:
 *   1. Si un lazo de control usa ese sensor, se compara contra su SETPOINT.
 *   2. Si no hay setpoint, contra el RANGO VÁLIDO del tipo de sensor
 *      (tercio bajo = bajo, tercio medio = ideal, tercio alto = alto).
 *   3. Si no hay ninguno de los dos, la variable se muestra pero la planta
 *      queda neutra para esa variable (nivel "unknown").
 */
export type VarKey = "temperature" | "humidity" | "light" | "soil" | "co2" | "ph" | "ec" | "wind";
export type Level = "low" | "ideal" | "high" | "unknown";

export interface VarInput {
  key: VarKey;
  label: string;
  unit: string;
  value: number | null;
  /** Rango válido del tipo de sensor (puede faltar). */
  min: number | null;
  max: number | null;
  /** Setpoint de un lazo de control sobre este sensor, si existe. */
  setpoint: number | null;
  sensorId: number;
}

export interface VarState extends VarInput {
  level: Level;
  /** -1 (muy bajo) … 0 (ideal) … +1 (muy alto). 0 si se desconoce. */
  k: number;
  /** Posición 0..1 dentro del rango válido (para la barrita), o null. */
  pos: number | null;
  reference: "setpoint" | "range" | "none";
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function evaluate(v: VarInput): VarState {
  const hasRange = v.min != null && v.max != null && v.max > v.min;
  const span = hasRange ? (v.max as number) - (v.min as number) : null;
  const pos = v.value != null && span ? clamp((v.value - (v.min as number)) / span, 0, 1) : null;

  if (v.value == null) return { ...v, level: "unknown", k: 0, pos, reference: v.setpoint != null ? "setpoint" : hasRange ? "range" : "none" };

  if (v.setpoint != null) {
    // Escala de la desviación: el rango válido si existe; si no, un porcentaje del propio setpoint.
    const scale = span ?? Math.max(Math.abs(v.setpoint) * 0.5, 1e-6);
    const dev = (v.value - v.setpoint) / scale;
    const tol = 0.06; // dentro de ±6 % de la escala se considera ideal
    const level: Level = Math.abs(dev) <= tol ? "ideal" : dev > 0 ? "high" : "low";
    const k = Math.abs(dev) <= tol ? 0 : clamp(dev / 0.25, -1, 1);
    return { ...v, level, k, pos, reference: "setpoint" };
  }

  if (pos != null) {
    const level: Level = pos < 1 / 3 ? "low" : pos > 2 / 3 ? "high" : "ideal";
    const k = clamp((pos - 0.5) * 2, -1, 1);
    // Dentro del tercio medio la planta se ve "ideal" (k ≈ 0).
    return { ...v, level, k: Math.abs(k) < 1 / 3 ? 0 : k, pos, reference: "range" };
  }

  return { ...v, level: "unknown", k: 0, pos: null, reference: "none" };
}

// ---- color ------------------------------------------------------------------
type RGB = [number, number, number];
const parse = (s: string): RGB =>
  s.startsWith("#")
    ? ([1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB)
    : ((s.match(/\d+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as RGB);
/** Mezcla dos colores ("#rrggbb" o "rgb(r g b)"); permite encadenar mezclas. */
export function mixRgb(a: string, b: string, t: number): string {
  const [x, y] = [parse(a), parse(b)];
  const k = clamp(t, 0, 1);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

export interface PlantLook {
  leafFill: string;
  leafVein: string;
  soilFill: string;
  soilTint: string;
  soilTintOpacity: number;
  stretch: number;      // 1 = normal; >1 = etiolada (poca luz)
  leafUp: number;       // grados que se suman al ángulo de las hojas (+ = hacia arriba)
  leafCurl: number;     // 0..1 enrollamiento (baja humedad)
  wiltDrop: number;     // grados que cuelgan las hojas (calor / suelo seco)
  heat: number;         // 0..1
  cold: number;         // 0..1
  wet: number;          // 0..1 humedad ambiental alta
  sunny: number;        // 0..1 luz alta
  dim: number;          // 0..1 luz baja
  soilWet: number;      // 0..1
  soilDry: number;      // 0..1
  co2: number;          // 0..1 cantidad de partículas
  wind: number;         // 0..1
  salty: number;        // 0..1 conductividad alta
  allIdeal: boolean;
}

const pos = (n: number) => Math.max(0, n);

/** Traduce los estados de las variables a parámetros visuales continuos. */
export function lookFor(s: Partial<Record<VarKey, VarState>>): PlantLook {
  const k = (key: VarKey) => s[key]?.k ?? 0;
  const known = (key: VarKey) => !!s[key] && s[key]!.level !== "unknown";
  const t = k("temperature"), h = k("humidity"), l = k("light"), so = k("soil");

  let leaf = "#3d9a55";
  leaf = mixRgb(leaf, "#bcd16d", pos(-l) * 0.85);                 // poca luz: pálida
  leaf = mixRgb(leaf, "#b3aa4c", pos(-so) * 0.7 + pos(-h) * 0.35); // seca: amarillenta
  leaf = mixRgb(leaf, "#5d97ab", pos(-t) * 0.55);                  // frío: tinte azulado
  leaf = mixRgb(leaf, "#8c9a3a", pos(t) * 0.45);                   // calor: se tuesta
  leaf = mixRgb(leaf, "#2f9a55", pos(h) * 0.25);                   // húmedo: más brillante

  const ph = k("ph");
  const soilBase = mixRgb("#4a3324", "#b9966b", pos(-so));          // oscuro mojado → claro seco
  const soilWetDark = mixRgb(soilBase, "#2a1b12", pos(so) * 0.6);
  const soilTint = ph < 0 ? "#d9683b" : "#3ba8b8";                  // ácido cálido / alcalino azulado

  const vals = (Object.values(s) as VarState[]).filter((v) => v.level !== "unknown");
  return {
    leafFill: leaf,
    leafVein: mixRgb(leaf, "#0f3d22", 0.45),
    soilFill: soilWetDark,
    soilTint,
    soilTintOpacity: known("ph") ? Math.abs(ph) * 0.45 : 0,
    stretch: 1 + pos(-l) * 0.16,
    leafUp: known("light") ? l * 12 : 0,
    leafCurl: pos(-h) * 0.85 + pos(-so) * 0.3,
    wiltDrop: pos(t) * 24 + pos(-so) * 28 + pos(-h) * 6,
    heat: pos(t),
    cold: pos(-t),
    wet: pos(h),
    sunny: pos(l),
    dim: pos(-l),
    soilWet: pos(so),
    soilDry: pos(-so),
    co2: known("co2") ? clamp(0.45 + k("co2") * 0.55, 0.05, 1) : 0,
    wind: known("wind") ? clamp(s.wind?.pos ?? 0.5 + k("wind") * 0.5, 0, 1) : 0,
    salty: pos(k("ec")),
    allIdeal: vals.length >= 2 && vals.every((v) => v.level === "ideal"),
  };
}

export const LEVEL_TEXT: Record<Level, string> = { low: "Bajo", ideal: "Ideal", high: "Alto", unknown: "Sin referencia" };
