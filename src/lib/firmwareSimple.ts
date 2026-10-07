/**
 * Programas de ejemplo (Arduino / ESP32) para UN sensor o UN actuador, con el
 * mismo formato que el del panel Control: un bloque "AJUSTES" generado con los
 * datos reales y el resto del programa fijo.
 *
 * Si el ESP32 también ejecuta lazos de control, debe usar el programa del
 * panel Control (un ESP32 = un programa); estos son para casos sueltos.
 * Nada de esto viaja al servidor: es texto para copiar o descargar.
 */
import { cf, cleanHost, cstr, line, sensorExamples, testValue, tlsFor } from "./firmware";

export const AJUSTES_START = "// ======================= AJUSTES =======================";
export const AJUSTES_END = "// =======================================================";

export interface NetOptions {
  ssid: string;
  pass: string;
  host: string;
  port: number;
}

function netDefines(n: NetOptions): string[] {
  const host = cleanHost(n.host) || "IP_DE_TU_PC";
  const tls = tlsFor(n.port);
  return [
    `#define WIFI_SSID     ${cstr(n.ssid || "TU_WIFI")}`,
    `#define WIFI_PASS     ${cstr(n.pass || "TU_CLAVE")}`,
    `#define SERVER_HOST   ${cstr(host)}   // IP o dominio del servidor, sin https:// ni "/". NO "localhost".`,
    `#define SERVER_PORT   ${n.port || 8000}${tls ? "      // 443 = HTTPS (dominio o túnel de Cloudflare)" : "     // 8000 = HTTP en la red local"}`,
    `#define USE_TLS       ${tls}${tls ? "      // cifrado (HTTPS)" : "     // true si el servidor usa HTTPS (puerto 443)"}`,
  ];
}

const WIFI_HELPERS = `
// Conecta (o reconecta) el WiFi. Devuelve true si hay conexión.
bool asegurarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.print("Conectando a WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " listo" : " sin conexión (se reintenta)");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP del ESP32: ");
    Serial.println(WiFi.localIP());
  }
  return WiFi.status() == WL_CONNECTED;
}

String urlBase() {
  // Con USE_TLS la conexión va cifrada (HTTPS). Sin certificado configurado, el ESP32
  // cifra pero no verifica el certificado del servidor: suficiente para pruebas.
  return String(USE_TLS ? "https://" : "http://") + SERVER_HOST + ":" + SERVER_PORT;
}
`;

/* ------------------------------------------------------------------ sensor */

export interface SensorSketchOptions extends NetOptions {
  deviceName: string;
  keyPrefix: string;
  sensorId: number;
  sensorName: string;
  unit: string;
  code: string;
  intervalMs: number;
  read: "custom" | "analog" | "test";
  pin: number;
  min: number;
  max: number;
}

export function buildSensorSketch(o: SensorSketchOptions): { settings: string; full: string } {
  const s: string[] = [AJUSTES_START];
  s.push(`// Generado en la página del sensor "${line(o.sensorName)}".`);
  s.push(...netDefines(o));
  s.push(
    `#define DEVICE_KEY    "PEGA_AQUI_LA_API_KEY_DEL_DISPOSITIVO"   // la de "${line(o.deviceName || "tu dispositivo")}"${o.keyPrefix ? `, empieza con ${line(o.keyPrefix)}` : ""}`
  );
  s.push("");
  s.push(`#define SENSOR_ID     ${o.sensorId}      // ${line(o.sensorName)} (${line(o.unit || "sin unidad")})`);
  s.push(`#define INTERVALO_MS  ${Math.max(1000, Math.round(o.intervalMs))}   // cada cuánto se manda una lectura`);
  s.push("");
  s.push("// Mide el sensor. Devuelve NAN si no hay medición válida (esa vez no se manda nada).");
  s.push("float leerSensor() {");
  if (o.read === "test") {
    s.push(...testValue(o.min, o.max, "  "));
  } else if (o.read === "analog") {
    s.push(`  // Entrada analógica en GPIO ${o.pin}: 0..4095 -> ${o.min}..${o.max} ${line(o.unit)}. Ajusta el rango al calibrar.`);
    s.push(`  return ${cf(o.min)} + analogRead(${o.pin}) * (${cf(o.max)} - ${cf(o.min)}) / 4095.0f;`);
  } else {
    s.push(`  // ESCRIBE AQUÍ cómo se mide y devuelve el valor en ${line(o.unit || "su unidad")}.`);
    for (const ex of sensorExamples(o.code)) s.push(`  // ${ex}`);
    s.push("  return NAN;");
  }
  s.push("}");
  s.push(AJUSTES_END);
  const settings = s.join("\n");

  const full = `/*
 * Manda las lecturas de UN sensor al Invernadero (ESP32 · núcleo Arduino-ESP32 3.x).
 * POST /api/v1/readings/ingest/ con el header X-Device-Key del dispositivo.
 *
 * Si este ESP32 también controla actuadores con un lazo, usa en su lugar el
 * programa de la página Control: un ESP32 solo puede tener un programa.
 *
 * Qué debes ajustar: el bloque AJUSTES (y leerSensor() si dice "ESCRIBE AQUÍ").
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

${settings}
${WIFI_HELPERS}
// Manda una lectura. Devuelve el código HTTP (200 = llegó bien).
int enviarLectura(float valor) {
  HTTPClient http;
  http.begin(urlBase() + "/api/v1/readings/ingest/");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  String body = String("{\\"sensor_id\\":") + SENSOR_ID + ",\\"value\\":" + String(valor, 2) + "}";
  int status = http.POST(body);
  Serial.printf("Lectura %.2f -> HTTP %d %s\\n", valor, status, http.getString().c_str());
  http.end();
  return status;
}

uint32_t ultimo = 0;

void setup() {
  Serial.begin(115200);
  delay(200);
  asegurarWiFi();
}

void loop() {
  if (millis() - ultimo < INTERVALO_MS && ultimo != 0) return;
  ultimo = millis();
  if (!asegurarWiFi()) return;

  float valor = leerSensor();
  if (isnan(valor)) {
    Serial.println("Sin medición válida: no se manda nada.");
    return;
  }
  enviarLectura(valor);
}
`;
  return { settings, full };
}

/* ---------------------------------------------------------------- actuador */

export interface ActuatorSketchOptions extends NetOptions {
  actuatorId: number;
  actuatorName: string;
  user: string;
  userPass: string;
  pin: number;
  activeLow: boolean;
  intervalMs: number;
}

export function buildActuatorSketch(o: ActuatorSketchOptions): { settings: string; full: string } {
  const s: string[] = [AJUSTES_START];
  s.push(`// Generado en la página del actuador "${line(o.actuatorName)}".`);
  s.push(...netDefines(o));
  s.push("");
  s.push("// Usuario REAL con acceso a este invernadero (basta rol viewer para leer el estado).");
  s.push("// Conviene crear uno solo para el dispositivo en la página Usuarios.");
  s.push(`#define USUARIO       ${cstr(o.user || "usuario_del_dispositivo")}`);
  s.push(`#define CONTRASENA    ${cstr(o.userPass || "su_contrasena")}`);
  s.push("");
  s.push(`#define ACTUADOR_ID   ${o.actuatorId}      // ${line(o.actuatorName)}`);
  s.push(`#define PIN_SALIDA    ${o.pin}      // pin que maneja el relevador / transistor`);
  s.push(`#define ACTIVO_EN_LOW ${o.activeLow}   // true si tu módulo de relevador se activa con LOW`);
  s.push(`#define INTERVALO_MS  ${Math.max(500, Math.round(o.intervalMs))}   // cada cuánto pregunta el estado`);
  s.push(AJUSTES_END);
  const settings = s.join("\n");

  const full = `/*
 * Obedece el estado (encendido / apagado) de UN actuador del Invernadero
 * (ESP32 · núcleo Arduino-ESP32 3.x). Pregunta GET /api/v1/actuators/<id>/
 * con un usuario real (Basic Auth) y copia "state" a un pin.
 *
 * Si este actuador lo maneja un lazo de control, usa en su lugar el programa
 * de la página Control: ahí el ESP32 calcula la salida.
 *
 * Librería (Gestor de librerías): "ArduinoJson" 7.x
 * Qué debes ajustar: el bloque AJUSTES.
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

${settings}
${WIFI_HELPERS}
void aplicar(bool encendido) {
  digitalWrite(PIN_SALIDA, (encendido != ACTIVO_EN_LOW) ? HIGH : LOW);
}

// Devuelve 1 = encendido, 0 = apagado, -1 = no se pudo consultar.
int leerEstado() {
  HTTPClient http;
  http.begin(urlBase() + "/api/v1/actuators/" + ACTUADOR_ID + "/");
  http.setAuthorization(USUARIO, CONTRASENA);
  http.addHeader("Accept", "application/json");
  int status = http.GET();
  int resultado = -1;
  if (status == 200) {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getString()) && doc["state"].is<bool>()) {
      resultado = doc["state"].as<bool>() ? 1 : 0;
    }
  } else {
    Serial.printf("HTTP %d (401/403 = usuario o permisos; 404 = id equivocado)\\n", status);
  }
  http.end();
  return resultado;
}

uint32_t ultimo = 0;
int estadoActual = -1;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SALIDA, OUTPUT);
  aplicar(false);                 // arranca SIEMPRE apagado
  delay(200);
  asegurarWiFi();
}

void loop() {
  if (millis() - ultimo < INTERVALO_MS && ultimo != 0) return;
  ultimo = millis();
  if (!asegurarWiFi()) return;    // sin red: conserva el último estado

  int estado = leerEstado();
  if (estado >= 0 && estado != estadoActual) {
    estadoActual = estado;
    aplicar(estado == 1);
    Serial.println(estado ? "Encendido" : "Apagado");
  }
}
`;
  return { settings, full };
}
