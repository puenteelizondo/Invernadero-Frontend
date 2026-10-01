import {
  Activity,
  Atom,
  CloudFog,
  Droplet,
  FlaskConical,
  Gauge,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo de sensores "ya diseñados" que se ofrecen al crear un
 * sensor: cada uno trae un ícono, nombre y unidad sugeridos.
 *
 * IMPORTANTE sobre cómo encaja con el backend: SensorType es un
 * catálogo real en la base de datos (tabla `sensors_sensortype`), no
 * algo que este frontend invente. Solo el staff puede CREAR tipos
 * nuevos (`POST /api/v1/sensor-types/` exige `IsAdminUser` -- ver
 * `apps/sensors/views.py::SensorTypeViewSet`). Un usuario normal solo
 * puede LEER el catálogo y elegir uno ya existente al crear su
 * sensor.
 *
 * Por eso esta lista cumple dos papeles distintos según el rol:
 *   - Para cualquier usuario: sirve para ponerle un ícono bonito a
 *     cada SensorType que YA exista en el backend, haciendo match por
 *     `code` (ver SensorIcon.tsx). Si el tipo no está aquí, se usa un
 *     ícono genérico -- nunca se inventa que el tipo "existe" si no
 *     está en la base de datos.
 *   - Para un usuario staff: sirve como atajo para SEMBRAR el
 *     catálogo con un clic (nombre/unidad/rango ya pre-llenados) en
 *     vez de escribir cada campo a mano.
 */
export interface SensorPreset {
  code: string;
  name: string;
  default_unit: string;
  valid_min: number | null;
  valid_max: number | null;
  description: string;
  icon: LucideIcon;
  color: string; // clase de Tailwind, ej. "text-red-500"
  hex: string; // mismo color en hex -- recharts (LiveSparkline/SensorDetailPage) no puede usar clases de Tailwind
  // Clase de animación continua de Tailwind (ver tailwind.config.js)
  // que le da "movimiento" al ícono mientras el panel está en vivo --
  // aparte del "flash" que se dispara con cada lectura nueva (ver
  // components/TypeIcon.tsx).
  motion: string;
}

export const SENSOR_PRESETS: SensorPreset[] = [
  {
    code: "temperature",
    name: "Temperatura",
    default_unit: "°C",
    valid_min: -20,
    valid_max: 80,
    description: "Temperatura ambiente o de sustrato.",
    icon: Thermometer,
    color: "text-red-500",
    hex: "#ef4444",
    motion: "animate-flicker",
  },
  {
    code: "humidity",
    name: "Humedad relativa",
    default_unit: "%",
    valid_min: 0,
    valid_max: 100,
    description: "Humedad relativa del aire.",
    icon: Droplet,
    color: "text-sky-500",
    hex: "#0ea5e9",
    motion: "animate-bob",
  },
  {
    code: "soil_moisture",
    name: "Humedad de suelo",
    default_unit: "%",
    valid_min: 0,
    valid_max: 100,
    description: "Humedad del sustrato/tierra.",
    icon: Sprout,
    color: "text-emerald-600",
    hex: "#059669",
    motion: "animate-sway",
  },
  {
    code: "co2",
    name: "CO₂",
    default_unit: "ppm",
    valid_min: 0,
    valid_max: 5000,
    description: "Concentración de dióxido de carbono.",
    icon: CloudFog,
    color: "text-slate-500",
    hex: "#64748b",
    motion: "animate-bob",
  },
  {
    code: "ph",
    name: "pH",
    default_unit: "pH",
    valid_min: 0,
    valid_max: 14,
    description: "Acidez/alcalinidad del agua o sustrato.",
    icon: FlaskConical,
    color: "text-fuchsia-500",
    hex: "#d946ef",
    motion: "animate-sway",
  },
  {
    code: "light",
    name: "Luminosidad",
    default_unit: "lux",
    valid_min: 0,
    valid_max: 200000,
    description: "Intensidad de luz.",
    icon: Sun,
    color: "text-amber-500",
    hex: "#f59e0b",
    motion: "animate-flicker",
  },
  {
    code: "water_level",
    name: "Nivel de agua",
    default_unit: "cm",
    valid_min: 0,
    valid_max: null,
    description: "Nivel de agua de un depósito o canal.",
    icon: Waves,
    color: "text-cyan-600",
    hex: "#0891b2",
    motion: "animate-bob",
  },
  {
    code: "ec",
    name: "Conductividad eléctrica",
    default_unit: "mS/cm",
    valid_min: 0,
    valid_max: null,
    description: "Concentración de nutrientes disueltos.",
    icon: Activity,
    color: "text-violet-500",
    hex: "#8b5cf6",
    motion: "",
  },
  {
    code: "pressure",
    name: "Presión atmosférica",
    default_unit: "hPa",
    valid_min: 800,
    valid_max: 1200,
    description: "Presión atmosférica.",
    icon: Gauge,
    color: "text-orange-500",
    hex: "#f97316",
    motion: "",
  },
  {
    code: "oxygen",
    name: "Oxígeno",
    default_unit: "%",
    valid_min: 0,
    valid_max: 25,
    description: "Oxígeno disuelto o ambiental.",
    icon: Atom,
    color: "text-blue-500",
    hex: "#3b82f6",
    motion: "animate-bob",
  },
  {
    code: "wind_speed",
    name: "Velocidad del viento",
    default_unit: "m/s",
    valid_min: 0,
    valid_max: null,
    description: "Velocidad del viento (invernaderos abiertos/mallas).",
    icon: Wind,
    color: "text-teal-500",
    hex: "#14b8a6",
    motion: "animate-spin-slow",
  },
];

/** Minúsculas y sin acentos, para comparar nombres sin depender de cómo se escribieron. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Respaldo cuando el `code` del tipo en la base de datos no coincide
// exactamente con ninguno de los presets (por ejemplo un tipo creado a
// mano como "Oxigeno"): se busca por palabras clave en el código y el
// nombre. El orden importa: "humedad de suelo" debe caer en suelo antes
// que en humedad.
const KEYWORDS: Array<[string, RegExp]> = [
  ["soil_moisture", /suelo|soil|sustrato|tierra/],
  ["humidity", /humed|humid/],
  ["temperature", /temp/],
  ["co2", /co2|co₂|carbono|dioxido/],
  ["oxygen", /oxig|oxyg|\bo2\b|o₂/],
  ["ph", /\bph\b|acidez/],
  ["light", /\bluz\b|lumin|light|\blux\b|solar|radiacion/],
  ["wind_speed", /viento|wind|anemo/],
  ["pressure", /presion|pressure|baro/],
  ["ec", /conduct|\bec\b|salin/],
  ["water_level", /nivel|level|agua|water|tanque|deposito/],
];

/**
 * Busca el preset de un tipo de sensor: primero por `code` exacto y, si
 * no hay, por palabras clave en el código y el nombre (ver KEYWORDS).
 */
export function findSensorPreset(code: string, name?: string): SensorPreset | undefined {
  const exact = SENSOR_PRESETS.find((p) => p.code === code);
  if (exact) return exact;
  const haystack = normalize(`${code} ${name ?? ""}`);
  for (const [presetCode, re] of KEYWORDS) {
    if (re.test(haystack)) return SENSOR_PRESETS.find((p) => p.code === presetCode);
  }
  return undefined;
}
