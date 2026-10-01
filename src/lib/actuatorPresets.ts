import {
  Fan,
  Droplets,
  Waves,
  Flame,
  Lightbulb,
  Snowflake,
  PanelTop,
  SprayCan,
  type LucideIcon,
} from "lucide-react";

/**
 * Igual que sensorPresets.ts pero para ActuatorType: un catálogo de
 * "diseños" (ícono + nombre + descripción sugeridos) para que la UI
 * se vea bien al crear/listar actuadores.
 *
 * Mismo límite que con los sensores: ActuatorType es un catálogo real
 * en la base de datos (`sensors_actuatortype` / `apps.actuators`).
 * Solo el staff puede crear tipos nuevos (`POST /api/v1/actuator-types/`
 * exige `IsAdminUser`). Un usuario normal elige entre los tipos que YA
 * existen; este archivo solo le pone un ícono a cada uno por `code` y
 * le da al staff valores sugeridos para sembrar el catálogo.
 */
export interface ActuatorPreset {
  code: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hex: string; // mismo color en hex, para el SVG de ActuatorArt
}

export const ACTUATOR_PRESETS: ActuatorPreset[] = [
  {
    code: "fan",
    name: "Ventilador",
    description: "Extracción o circulación de aire.",
    icon: Fan,
    color: "text-sky-500",
    hex: "#0ea5e9",
  },
  {
    code: "water_pump",
    name: "Bomba de agua",
    description: "Riego o recirculación de agua.",
    icon: Droplets,
    color: "text-blue-500",
    hex: "#3b82f6",
  },
  {
    code: "valve",
    name: "Válvula",
    description: "Apertura/cierre de una línea de riego o gas.",
    icon: Waves,
    color: "text-cyan-600",
    hex: "#0891b2",
  },
  {
    code: "heater",
    name: "Calefactor",
    description: "Calefacción del ambiente.",
    icon: Flame,
    color: "text-red-500",
    hex: "#ef4444",
  },
  {
    code: "light",
    name: "Iluminación",
    description: "Luz artificial de cultivo.",
    icon: Lightbulb,
    color: "text-amber-500",
    hex: "#f59e0b",
  },
  {
    code: "cooler",
    name: "Enfriador",
    description: "Enfriamiento evaporativo o refrigeración.",
    icon: Snowflake,
    color: "text-teal-500",
    hex: "#14b8a6",
  },
  {
    code: "curtain",
    name: "Cortina/malla",
    description: "Cortina de sombreo o ventilación cenital.",
    icon: PanelTop,
    color: "text-slate-500",
    hex: "#64748b",
  },
  {
    code: "mister",
    name: "Nebulizador",
    description: "Nebulización/fogging para humedad.",
    icon: SprayCan,
    color: "text-emerald-500",
    hex: "#10b981",
  },
];

/** Minúsculas y sin acentos, para comparar nombres sin depender de cómo se escribieron. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Respaldo cuando el `code` del tipo en la base de datos no coincide
// exactamente con un preset (p. ej. un tipo creado a mano como
// "Ventilador extractor"): se busca por palabras clave en código y nombre.
const KEYWORDS: Array<[string, RegExp]> = [
  ["water_pump", /bomba|pump/],
  ["mister", /nebul|mister|fog|aspers|rocia/],
  ["valve", /valvula|valve/],
  ["heater", /calef|heater|resisten|calent/],
  ["cooler", /enfri|cooler|refriger|clima|aire acond/],
  ["fan", /ventil|\bfan\b|extractor|soplador/],
  ["light", /\bluz\b|ilumin|lamp|foco|light|led\b/],
  ["curtain", /cortina|malla|curtain|sombra|techo|ventana|toldo/],
];

/**
 * Busca el preset de un tipo de actuador: primero por `code` exacto y,
 * si no hay, por palabras clave en el código y el nombre (ver KEYWORDS).
 */
export function findActuatorPreset(code: string, name?: string): ActuatorPreset | undefined {
  const exact = ACTUATOR_PRESETS.find((p) => p.code === code);
  if (exact) return exact;
  const haystack = normalize(`${code} ${name ?? ""}`);
  for (const [presetCode, re] of KEYWORDS) {
    if (re.test(haystack)) return ACTUATOR_PRESETS.find((p) => p.code === presetCode);
  }
  return undefined;
}
