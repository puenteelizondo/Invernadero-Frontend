import type { ControlDirection, ControlLoop, ControlMode, ControlParams } from "../types";

export const MODES: { value: ControlMode; label: string; hint: string }[] = [
  { value: "off", label: "Apagado", hint: "El lazo no actúa. La salida queda en 0 %." },
  { value: "on_off", label: "On/Off", hint: "Enciende al bajar del setpoint y apaga al pasarlo, con una banda (histéresis) para no oscilar." },
  { value: "p", label: "P", hint: "La salida es proporcional al error. Simple, pero suele quedarse un poco lejos del setpoint." },
  { value: "pi", label: "PI", hint: "Proporcional + integral: elimina el error que se queda sostenido." },
  { value: "pid", label: "PID", hint: "Proporcional + integral + derivativo: además frena a tiempo para no pasarse." },
];

export type ParamKey = keyof ControlParams;

/** Qué campos aplican a cada modo (solo se muestran esos). */
export const FIELDS_BY_MODE: Record<ControlMode, ParamKey[]> = {
  off: [],
  on_off: ["hysteresis", "output_max", "direction", "sample_time_ms"],
  p: ["kp", "output_min", "output_max", "direction", "sample_time_ms"],
  pi: ["kp", "ki", "output_min", "output_max", "integral_limit", "direction", "sample_time_ms"],
  pid: ["kp", "ki", "kd", "output_min", "output_max", "integral_limit", "direction", "sample_time_ms"],
};

export interface ParamMeta {
  label: string;
  unit?: string;
  step: number;
  min?: number;
  max?: number;
  help: string;
}

export const PARAM_META: Partial<Record<ParamKey, ParamMeta>> = {
  kp: { label: "Kp · Proporcional", step: 0.1, min: 0, help: "Qué tan fuerte reacciona al error de ahora. Más alto = responde más rápido, pero si te pasas empieza a oscilar." },
  ki: { label: "Ki · Integral", step: 0.01, min: 0, help: "Corrige el error que se acumula con el tiempo y evita que se quede lejos del setpoint. Muy alto = vaivenes lentos." },
  kd: { label: "Kd · Derivativo", step: 0.1, min: 0, help: "Mira qué tan rápido cambia la medición y frena antes de pasarse. Muy alto amplifica el ruido del sensor." },
  hysteresis: { label: "Histéresis", step: 0.1, min: 0, help: "Ancho de la banda alrededor del setpoint donde el actuador no cambia. Más ancho = menos encendidos, más variación." },
  output_min: { label: "Salida mínima", unit: "%", step: 1, min: 0, max: 100, help: "La salida nunca baja de este porcentaje mientras el lazo está activo." },
  output_max: { label: "Salida máxima", unit: "%", step: 1, min: 0, max: 100, help: "Tope de seguridad de la salida (por ejemplo, 80 % para no forzar el motor)." },
  integral_limit: { label: "Límite de integral", unit: "%", step: 1, min: 0, help: "Anti-windup: tope de lo que puede acumular la parte integral para que no se “cargue” de más cuando la salida está saturada." },
  sample_time_ms: { label: "Tiempo de muestreo", unit: "ms", step: 100, min: 100, max: 60000, help: "Cada cuánto el controlador lee el sensor y recalcula. Más rápido = más fino, pero más ruido." },
};

export const DIRECTIONS: { value: ControlDirection; label: string; hint: string }[] = [
  { value: "direct", label: "Directa", hint: "Subir la salida SUBE la variable (calefactor, humidificador, luz)." },
  { value: "reverse", label: "Inversa", hint: "Subir la salida BAJA la variable (ventilador o enfriador para la temperatura, deshumidificador)." },
];

export const PARAM_LABELS: Record<string, string> = {
  name: "Nombre", sensor_id: "Sensor", actuator_id: "Actuador", device_id: "Dispositivo",
  mode: "Modo", direction: "Dirección", setpoint: "Setpoint", hysteresis: "Histéresis",
  kp: "Kp", ki: "Ki", kd: "Kd", output_min: "Salida mín.", output_max: "Salida máx.",
  integral_limit: "Límite integral", sample_time_ms: "Muestreo", enabled: "Habilitado",
};

const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));
const DIR_LABEL = Object.fromEntries(DIRECTIONS.map((d) => [d.value, d.label]));

/** Valor legible de un parámetro (para el resumen "antes → después"). */
export function fmtParam(key: string, v: unknown, unit = ""): string {
  if (v == null) return "—";
  if (key === "mode") return MODE_LABEL[String(v)] ?? String(v);
  if (key === "direction") return DIR_LABEL[String(v)] ?? String(v);
  if (key === "enabled") return v ? "Sí" : "No";
  if (typeof v === "number") {
    const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    if (key === "setpoint") return `${s}${unit ? ` ${unit}` : ""}`;
    if (key === "output_min" || key === "output_max" || key === "integral_limit") return `${s} %`;
    if (key === "sample_time_ms") return `${s} ms`;
    return s;
  }
  return String(v);
}

export const EDITABLE: ParamKey[] = [
  "name", "mode", "direction", "setpoint", "hysteresis", "kp", "ki", "kd",
  "output_min", "output_max", "integral_limit", "sample_time_ms", "enabled",
];

export function paramsOf(loop: ControlLoop): ControlParams {
  return {
    name: loop.name, sensor: loop.sensor, actuator: loop.actuator, mode: loop.mode, direction: loop.direction,
    setpoint: loop.setpoint, hysteresis: loop.hysteresis, kp: loop.kp, ki: loop.ki, kd: loop.kd,
    output_min: loop.output_min, output_max: loop.output_max, integral_limit: loop.integral_limit,
    sample_time_ms: loop.sample_time_ms, enabled: loop.enabled,
  };
}

/** Cambios pendientes del borrador respecto a lo guardado. */
export function diffParams(server: ControlParams, draft: ControlParams) {
  const out: { key: ParamKey; before: unknown; after: unknown }[] = [];
  for (const key of EDITABLE) {
    if (server[key] !== draft[key]) out.push({ key, before: server[key], after: draft[key] });
  }
  return out;
}

/** Mensaje corto sobre si el ESP32 ya aplicó la última versión. */
export function applyState(loop: ControlLoop, now: number): { tone: "ok" | "wait" | "offline"; text: string } {
  if (!loop.pending) {
    if (!loop.applied_at) return { tone: loop.device_online ? "ok" : "offline", text: loop.device_online ? "Aplicado por el ESP32" : "Sin conexión con el dispositivo" };
    const secs = Math.max(0, Math.round((now - new Date(loop.applied_at).getTime()) / 1000));
    const ago = secs < 5 ? "ahora mismo" : secs < 60 ? `hace ${secs} s` : secs < 3600 ? `hace ${Math.round(secs / 60)} min` : `hace ${Math.round(secs / 3600)} h`;
    return { tone: "ok", text: `Aplicado por el ESP32 ${ago}` };
  }
  if (!loop.device_online) return { tone: "offline", text: "Sin conexión: se aplicará cuando el dispositivo se reconecte" };
  return { tone: "wait", text: "Enviando…" };
}

/** Lo que "es ideal" para el color del estado: banda de ±tolerancia alrededor del setpoint. */
export type Level = "low" | "ideal" | "high";
