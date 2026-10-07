/**
 * Genera el programa de Arduino (ESP32) para el panel "Control".
 *
 * La plantilla es una COPIA del firmware de referencia del backend
 * (Invernadero-Backend/firmware/esp32_control/esp32_control.ino). Si cambias
 * uno, copia el archivo al otro. Aquí solo se reemplaza el bloque "AJUSTES"
 * (WiFi, servidor, qué pin maneja cada actuador y cómo se mide cada sensor)
 * con los datos reales de los lazos del dispositivo.
 *
 * Nada de esto viaja al servidor: es texto que el usuario copia o descarga.
 */
import template from "./firmware/esp32_control.ino?raw";

const START = "// ======================= AJUSTES =======================";
const END = "// =======================================================";

export interface FwSensor {
  id: number;
  name: string;
  unit: string;
  code: string; // código del tipo de sensor (temperature, humidity...)
  loops: string[]; // nombres de los lazos que usan este sensor
  read: "custom" | "analog" | "test";
  pin: number;
  min: number;
  max: number;
}

export interface FwActuator {
  id: number;
  name: string;
  pin: number;
  relay: boolean;
  activeLow: boolean;
}

export interface FwOptions {
  deviceName: string;
  keyPrefix: string;
  ssid: string;
  pass: string;
  host: string;
  port: number;
  loopsCount: number;
  sensors: FwSensor[];
  actuators: FwActuator[];
}

// Pines sugeridos. Sensores analógicos: solo ADC1 (32–39); ADC2 no funciona con WiFi encendido.
export const ADC1_PINS = [34, 35, 36, 39, 32, 33];
export const OUTPUT_PINS = [26, 27, 25, 14, 13, 4, 16, 17, 18, 19, 21, 22, 23];

/** Cadena de C con comillas y barras escapadas. */
export function cstr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Texto de comentario en una sola línea (sin saltos ni cierre de comentario). */
export function line(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/\*\//g, "* /");
}

/** float literal de C (siempre con punto decimal y sufijo f). */
export function cf(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const s = String(Number(v.toFixed(4)));
  return `${s.includes(".") || s.includes("e") ? s : `${s}.0`}f`;
}

const EXAMPLES: Record<string, string[]> = {
  temperature: [
    "Ej. DHT22 (librería \"DHT sensor library\"):  return dht.readTemperature();",
    "Ej. DS18B20 (\"DallasTemperature\"):  ds.requestTemperatures(); return ds.getTempCByIndex(0);",
  ],
  humidity: ["Ej. DHT22:  return dht.readHumidity();"],
  soil_moisture: ["Ej. sensor capacitivo: elige \"Analógica\" en la página y calibra seco/mojado."],
  light: ["Ej. BH1750 (\"BH1750\"):  return luxometro.readLightLevel();"],
  co2: ["Ej. SCD30 / MH-Z19: devuelve las ppm que da su librería."],
  ph: ["Ej. sonda de pH con módulo analógico: elige \"Analógica\" y calibra con soluciones 4 y 7."],
  ec: ["Ej. sonda de EC con módulo analógico: elige \"Analógica\" y calibra con solución patrón."],
};

/** Comentarios de ejemplo para leer un sensor según el código de su tipo. */
/** Puerto 443 = HTTPS/WSS (dominio propio o túnel de Cloudflare); cualquier otro = HTTP en la red local. */
export function tlsFor(port: number): boolean {
  return (port || 8000) === 443;
}

/** Quita https://, http:// y "/" del final si alguien pega la dirección completa. */
export function cleanHost(host: string): string {
  return host.trim().replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
}

/**
 * Valor de PRUEBA: arranca a la mitad del rango y cambia poco a poco, para ver
 * llegar lecturas sin tener el sensor conectado. Se reemplaza por el sensor real.
 */
export function testValue(min: number, max: number, indent: string): string[] {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) && max > lo ? max : lo + 100;
  const mid = (lo + hi) / 2, span = (hi - lo) * 0.1, step = (hi - lo) * 0.01;
  return [
    `${indent}// PRUEBA: valor simulado (no hay sensor). Cámbialo por la lectura real de tu sensor.`,
    `${indent}static float v = ${cf(mid)};`,
    `${indent}v += random(-100, 101) / 100.0f * ${cf(step)};`,
    `${indent}v = constrain(v, ${cf(mid - span)}, ${cf(mid + span)});`,
    `${indent}return v;`,
  ];
}

export function sensorExamples(code: string): string[] {
  return EXAMPLES[code] ?? [];
}

export function buildSettings(o: FwOptions): string {
  const host = cleanHost(o.host) || "IP_DE_TU_PC";
  const sensors = o.sensors;
  const out: string[] = [];
  out.push(START);
  out.push(`// Generado en la página Control para el dispositivo "${line(o.deviceName)}".`);
  out.push(`#define WIFI_SSID     ${cstr(o.ssid || "TU_WIFI")}`);
  out.push(`#define WIFI_PASS     ${cstr(o.pass || "TU_CLAVE")}`);
  out.push(`#define SERVER_HOST   ${cstr(host)}${" ".repeat(Math.max(1, 18 - cstr(host).length))}// IP o dominio del servidor, sin https:// ni "/". NO "localhost".`);
  out.push(`#define SERVER_PORT   ${o.port || 8000}`);
  out.push(`#define USE_TLS       ${tlsFor(o.port)}${tlsFor(o.port) ? "               // HTTPS/WSS (dominio o túnel de Cloudflare)" : "              // true si el servidor usa HTTPS/WSS (puerto 443)"}`);
  out.push(`#define DEVICE_KEY    "PEGA_AQUI_LA_API_KEY_DEL_DISPOSITIVO"   // la de "${line(o.deviceName)}", empieza con ${line(o.keyPrefix)}`);
  out.push("");
  out.push(`#define MAX_LOOPS         ${Math.max(4, o.loopsCount)}`);
  out.push(`#define SENSOR_TIMEOUT_MS 10000          // sin medición válida por este tiempo => salida a 0 (seguro)`);
  out.push(`#define PWM_FREQ          1000`);
  out.push(`#define PWM_BITS          10`);
  out.push(`#define RELAY_WINDOW_MS   10000          // ventana de "proporcional en el tiempo" para relevadores`);
  out.push(`#define INGEST_EVERY_MS   5000           // cada cuánto se mandan las lecturas por HTTP`);
  out.push(`#define HARD_MAX_OUTPUT   100.0f         // tope absoluto de seguridad, pase lo que pase en la config`);
  out.push("");
  out.push("// Qué pin maneja cada actuador (ids = los de la plataforma). relay=true => proporcional en el tiempo.");
  out.push("struct Hw { int actuatorId; int pin; bool relay; bool activeLow; };");
  out.push("Hw HW[] = {");
  for (const a of o.actuators) {
    const tipo = a.relay ? "relevador" : "PWM";
    out.push(`  { ${a.id}, ${a.pin}, ${a.relay}, ${a.activeLow} },    // ${line(a.name)} (${tipo}${a.activeLow ? ", activo en LOW" : ""})`);
  }
  out.push("};");
  out.push("");
  out.push("// Ids de sensor que se miden y se mandan por ingesta.");
  out.push(`int SENSORES[] = { ${sensors.length ? sensors.map((s) => s.id).join(", ") : "0"} };`);
  out.push("");
  out.push("// Mide un sensor. Devuelve NAN si no hay medición válida.");
  out.push("// Mientras un sensor devuelva NAN, su lazo deja la salida en 0 (apagado seguro).");
  out.push("float leerSensor(int sensorId) {");
  out.push("  switch (sensorId) {");
  for (const s of sensors) {
    const usos = s.loops.length ? ` · lazo ${s.loops.map((n) => `"${line(n)}"`).join(", ")}` : "";
    out.push(`    case ${s.id}: {  // ${line(s.name)} (${line(s.unit || "sin unidad")})${usos}`);
    if (s.read === "test") {
      out.push(...testValue(s.min, s.max, "      "));
    } else if (s.read === "analog") {
      out.push(`      // Entrada analógica en GPIO ${s.pin}: 0..4095 -> ${s.min}..${s.max} ${line(s.unit)}. Ajusta el rango al calibrar.`);
      out.push(`      return ${cf(s.min)} + analogRead(${s.pin}) * (${cf(s.max)} - ${cf(s.min)}) / 4095.0f;`);
    } else {
      out.push(`      // ESCRIBE AQUÍ cómo se mide y devuelve el valor en ${line(s.unit || "su unidad")}.`);
      for (const ex of EXAMPLES[s.code] ?? []) out.push(`      // ${ex}`);
      out.push("      return NAN;");
    }
    out.push("    }");
  }
  out.push("  }");
  out.push("  return NAN;");
  out.push("}");
  out.push(END);
  return out.join("\n");
}

/** Programa completo: la plantilla con el bloque AJUSTES reemplazado. */
export function buildSketch(o: FwOptions): string {
  const src = template.replace(/\r\n/g, "\n");
  const a = src.indexOf(START);
  const b = src.indexOf(END, a + START.length);
  if (a < 0 || b < 0) return src; // plantilla inesperada: se entrega tal cual
  return src.slice(0, a) + buildSettings(o) + src.slice(b + END.length);
}
