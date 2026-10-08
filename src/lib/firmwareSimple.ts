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
 * La conexión con el servidor se REUTILIZA entre lecturas (keep-alive): el
 * saludo HTTPS, que es lo más lento, se hace una sola vez y no en cada lectura.
 * Así cada envío tarda ~0.1-0.3 s y la página se actualiza casi al mismo tiempo
 * que el monitor serie.
 *
 * Si este ESP32 también controla actuadores con un lazo, usa en su lugar el
 * programa de la página Control: un ESP32 solo puede tener un programa.
 *
 * Qué debes ajustar: el bloque AJUSTES (y leerSensor() si dice "ESCRIBE AQUÍ").
 */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <math.h>

${settings}
${WIFI_HELPERS}
// Conexión que se reutiliza entre lecturas (no se cierra después de cada POST).
WiFiClientSecure clienteTLS;   // HTTPS (USE_TLS true)
WiFiClient clienteHTTP;        // HTTP en la red local (USE_TLS false)
HTTPClient http;

// Manda una lectura. Devuelve el código HTTP (200 = llegó bien).
int enviarLectura(float valor) {
  String body = String("{\\"sensor_id\\":") + SENSOR_ID + ",\\"value\\":" + String(valor, 2) + "}";
  NetworkClient& cliente = USE_TLS ? static_cast<NetworkClient&>(clienteTLS) : clienteHTTP;
  for (int intento = 1; intento <= 2; intento++) {
    uint32_t t0 = millis();
    http.begin(cliente, SERVER_HOST, SERVER_PORT, "/api/v1/readings/ingest/", USE_TLS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", DEVICE_KEY);
    int status = http.POST(body);
    if (status > 0) {
      String resp = http.getString();
      http.end();   // con setReuse(true) NO cierra la conexión: la siguiente lectura la reutiliza
      unsigned long ms = millis() - t0;
      if (status == 200) {
        Serial.printf("Lectura %.2f -> HTTP 200 en %lu ms%s\\n", valor, ms,
                      resp.indexOf("\\"persisted\\":1") >= 0 ? " (guardada en el historial)" : "");
      } else {
        Serial.printf("Lectura %.2f -> HTTP %d en %lu ms %s\\n", valor, status, ms, resp.c_str());
        if (status == 429) Serial.println("  Demasiadas lecturas por minuto (máx. 120): sube INTERVALO_MS.");
        if (status == 403) Serial.println("  Revisa DEVICE_KEY: el servidor no reconoce este dispositivo.");
      }
      return status;
    }
    // La conexión guardada ya no sirve (el túnel o el servidor la cerraron, o se
    // fue el WiFi): se cierra, y en el segundo intento se abre una nueva.
    Serial.printf("Conexión perdida (%s)%s\\n", http.errorToString(status).c_str(),
                  intento == 1 ? ", reintentando con una conexión nueva..." : "");
    http.end();
    cliente.stop();
  }
  return -1;
}

uint32_t ultimo = 0;

void setup() {
  Serial.begin(115200);
  delay(200);
  // Sin certificado configurado, el ESP32 cifra pero no verifica el certificado
  // del servidor: suficiente para pruebas.
  clienteTLS.setInsecure();
  http.setReuse(true);         // mantener la conexión abierta entre lecturas
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
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
  deviceName: string;
  keyPrefix: string;
  actuatorId: number;
  actuatorName: string;
  pin: number;
  activeLow: boolean;
}

export function buildActuatorSketch(o: ActuatorSketchOptions): { settings: string; full: string } {
  const s: string[] = [AJUSTES_START];
  s.push(`// Generado en la página del actuador "${line(o.actuatorName)}".`);
  s.push(...netDefines(o));
  s.push(
    `#define DEVICE_KEY    "PEGA_AQUI_LA_API_KEY_DEL_DISPOSITIVO"   // la de "${line(o.deviceName || "tu dispositivo")}"${o.keyPrefix ? `, empieza con ${line(o.keyPrefix)}` : ""}`
  );
  s.push("");
  s.push(`#define ACTUADOR_ID   ${o.actuatorId}      // ${line(o.actuatorName)}`);
  s.push(`#define PIN_SALIDA    ${o.pin}      // pin que maneja el relevador / transistor`);
  s.push(`#define ACTIVO_EN_LOW ${o.activeLow}   // true si tu módulo de relevador se activa con LOW`);
  s.push(AJUSTES_END);
  const settings = s.join("\n");

  const full = `/*
 * Obedece AL INSTANTE el estado (encendido / apagado) de UN actuador del
 * Invernadero (ESP32 · núcleo Arduino-ESP32 3.x).
 *
 * Cómo funciona: con la clave del dispositivo pide un token de un solo uso
 * (POST /api/v1/devices/ws-token/) y abre el WebSocket /ws/device/. Al
 * conectarse, el servidor le manda el estado actual; cada vez que alguien
 * cambia el interruptor en la página, el servidor le avisa en ese momento
 * (evento "actuator_state"). No pregunta una y otra vez, y no guarda la
 * contraseña de ninguna persona: solo la clave de SU dispositivo.
 *
 * Si se cae la red, CONSERVA el último estado y se reconecta solo.
 * Si este actuador lo maneja un lazo de control, usa en su lugar el programa
 * de la página Control: ahí el ESP32 calcula la salida.
 *
 * Librerías (Gestor de librerías): "WebSockets" de Markus Sattler (Links2004)  y  "ArduinoJson" 7.x
 * Qué debes ajustar: el bloque AJUSTES.
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

${settings}
${WIFI_HELPERS}
WebSocketsClient ws;
bool wsUp = false;
uint32_t nextConnect = 0, backoffMs = 1000;
int estadoActual = -1;            // -1 = todavía sin orden del servidor

void aplicar(bool encendido) {
  digitalWrite(PIN_SALIDA, (encendido != ACTIVO_EN_LOW) ? HIGH : LOW);
}

void orden(bool encendido) {
  if (estadoActual == (encendido ? 1 : 0)) return;
  estadoActual = encendido ? 1 : 0;
  aplicar(encendido);
  Serial.println(encendido ? "ENCENDIDO" : "Apagado");
}

void alEventoWS(WStype_t tipo, uint8_t* payload, size_t len) {
  switch (tipo) {
    case WStype_CONNECTED:
      wsUp = true; backoffMs = 1000;
      Serial.println("[WS] conectado: esperando órdenes de la página");
      break;
    case WStype_DISCONNECTED:
      if (wsUp) Serial.println("[WS] desconectado; se conserva el último estado y se reintenta");
      wsUp = false;
      nextConnect = millis() + backoffMs;
      backoffMs = min<uint32_t>(backoffMs * 2, 30000);   // espera progresiva
      break;
    case WStype_TEXT: {
      JsonDocument d;
      if (deserializeJson(d, payload, len)) return;
      const char* ev = d["event"] | "";
      if (!strcmp(ev, "actuators")) {          // al conectar: estado actual de los actuadores de este dispositivo
        bool encontrado = false;
        for (JsonObjectConst a : d["actuators"].as<JsonArrayConst>()) {
          if ((a["id"] | 0) == ACTUADOR_ID) { orden(a["state"] | false); encontrado = true; }
        }
        if (!encontrado) {
          Serial.println("Ojo: el actuador " + String(ACTUADOR_ID) + " no está asignado a este dispositivo");
          Serial.println("     (o está desactivado). Asígnalo en su página: \\"Dispositivo al que pertenece\\".");
        }
      } else if (!strcmp(ev, "actuator_state")) {   // alguien lo cambió en la página
        if ((d["actuator_id"] | 0) == ACTUADOR_ID) orden(d["state"] | false);
      } else if (!strcmp(ev, "ping")) {
        ws.sendTXT("{\\"event\\":\\"pong\\"}");
      }
      break;
    }
    default: break;
  }
}

String pedirToken() {
  HTTPClient http;
  http.begin(urlBase() + "/api/v1/devices/ws-token/");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST("{}");
  String token = "";
  if (code == 200) {
    JsonDocument d;
    if (!deserializeJson(d, http.getString())) token = String((const char*)(d["token"] | ""));
  } else {
    Serial.printf("[token] HTTP %d%s\\n", code, code == 403 ? " (revisa DEVICE_KEY)" : "");
  }
  http.end();
  return token;
}

void conectarWS() {
  String token = pedirToken();              // un token de un solo uso por conexión
  if (token.length() == 0) {
    nextConnect = millis() + backoffMs; backoffMs = min<uint32_t>(backoffMs * 2, 30000); return;
  }
  String path = "/ws/device/?token=" + token;
  if (USE_TLS) ws.beginSSL(SERVER_HOST, SERVER_PORT, path); else ws.begin(SERVER_HOST, SERVER_PORT, path);
  ws.onEvent(alEventoWS);
  ws.setReconnectInterval(0);               // la reconexión la manejamos nosotros (token nuevo)
  nextConnect = millis() + 15000;           // si no conecta en 15 s, se vuelve a intentar
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SALIDA, OUTPUT);
  aplicar(false);                           // arranca SIEMPRE apagado
  delay(200);
  asegurarWiFi();
}

void loop() {
  ws.loop();
  if (!wsUp && millis() >= nextConnect) {
    if (asegurarWiFi()) conectarWS(); else nextConnect = millis() + 2000;
  }
}
`;
  return { settings, full };
}
