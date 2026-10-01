import { useState } from "react";
import { Cable, Info } from "lucide-react";
import { useDevices, useUpdateActuator } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Actuator } from "../types";
import { CopyButton } from "./CopyButton";
import { Button, Card, ErrorText, Select } from "./ui";

/**
 * Datos para conectar un actuador físico (relé, bomba, ventilador...) con
 * el sistema: su `actuator_id`, a qué dispositivo pertenece, cómo se
 * cambia su estado y cómo puede enterarse el hardware.
 *
 * Límite real del backend (ver README): la API key de dispositivo
 * (X-Device-Key) SOLO sirve para mandar lecturas (POST /readings/ingest/).
 * No existe un endpoint donde el dispositivo consulte el estado de un
 * actuador con su API key. Lo que sí existe y se documenta aquí:
 *   - el estado lo cambia un usuario con rol Owner u Operator
 *     (POST /actuators/{id}/state/), y
 *   - el hardware puede enterarse consultando GET /actuators/{id}/ con
 *     un usuario real (Basic Auth; basta con rol Viewer para leer).
 */
export function ActuatorConnectPanel({ actuator, greenhouseId }: { actuator: Actuator; greenhouseId: number }) {
  const { data: devices } = useDevices(greenhouseId);
  const updateActuator = useUpdateActuator(greenhouseId);
  const [deviceId, setDeviceId] = useState<number | "">(actuator.device ?? "");

  const code = `#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";

// Dirección del backend: la IP de la computadora donde corre (ipconfig) y el puerto 8000.
const char* URL  = "http://<IP-DE-TU-PC>:8000/api/v1/actuators/${actuator.id}/";

// Usuario real con acceso a este invernadero (basta rol "viewer" para LEER el estado).
const char* USER = "usuario_para_el_dispositivo";
const char* PASS = "su_contraseña";

const int PIN_RELE = 26;                    // pin que maneja tu relé
const unsigned long INTERVALO_MS = 2000;    // cada cuánto pregunta

// Devuelve 1 = encendido, 0 = apagado, -1 = no se pudo consultar.
int leerEstado() {
  HTTPClient http;
  http.begin(URL);
  http.setAuthorization(USER, PASS);
  http.addHeader("Accept", "application/json");
  int status = http.GET();
  int resultado = -1;
  if (status == 200) {
    String body = http.getString();
    bool on = body.indexOf("\\"state\\":true") >= 0 || body.indexOf("\\"state\\": true") >= 0;
    resultado = on ? 1 : 0;
  }
  http.end();
  return resultado;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELE, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  int estado = leerEstado();
  if (estado >= 0) digitalWrite(PIN_RELE, estado ? HIGH : LOW);  // si falla, conserva el último estado
  delay(INTERVALO_MS);
}`;

  const http = `# Encender / apagar (usuario con rol Owner u Operator)
POST /api/v1/actuators/${actuator.id}/state/
Authorization: Basic <usuario:contraseña en base64>   (o sesión + X-CSRFToken)
Content-Type: application/json

{ "state": true }

# Consultar el estado actual (basta rol Viewer)
GET /api/v1/actuators/${actuator.id}/`;

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
          <Cable className="h-5 w-5 text-brand-700" />
        </span>
        <div>
          <h2 className="font-semibold text-neutral-900">Conectar este actuador</h2>
          <p className="text-xs text-neutral-500">Cómo se identifica y cómo puede obedecerlo tu Arduino/ESP32.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">ID del actuador (actuator_id)</p>
          <p className="font-mono text-4xl font-bold text-brand-900">{actuator.id}</p>
        </div>
        <CopyButton text={String(actuator.id)} label="Copiar ID" className="border border-brand-200 bg-white" />
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          La API key del dispositivo solo sirve para <b>mandar lecturas</b>. Un actuador no la usa: su estado lo cambia
          una persona (o una automatización) desde el panel, y el hardware lo <b>consulta</b> con un usuario real.
        </span>
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Dispositivo al que pertenece</label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[14rem] flex-1">
            <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Sin asignar</option>
              {devices?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.key_prefix}…)
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            loading={updateActuator.isPending}
            disabled={(deviceId || null) === actuator.device}
            onClick={() => updateActuator.mutate({ id: actuator.id, device: deviceId || null })}
          >
            Guardar
          </Button>
        </div>
        <ErrorText>{updateActuator.isError ? formatApiError(updateActuator.error) : null}</ErrorText>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">Ejemplo para Arduino IDE (ESP32): obedecer este actuador</p>
          <CopyButton text={code} label="Copiar código" />
        </div>
        <pre className="max-h-80 overflow-auto rounded-xl bg-neutral-900 p-4 text-xs leading-relaxed text-emerald-100">
          <code>{code}</code>
        </pre>
        <p className="mt-1.5 text-xs text-neutral-500">
          Guarda la contraseña de ese usuario solo en el equipo; conviene crear una cuenta aparte con rol viewer para el
          dispositivo. Si el backend responde <code>400</code> desde otra máquina, agrega la IP de tu PC a{" "}
          <code>DJANGO_ALLOWED_HOSTS</code> en el <code>.env</code> del backend.
        </p>
      </div>

      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">Ver las peticiones HTTP (Postman)</summary>
        <div className="mt-2 flex items-start justify-between gap-2">
          <pre className="flex-1 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-emerald-100">
            <code>{http}</code>
          </pre>
          <CopyButton text={http} />
        </div>
      </details>
    </Card>
  );
}
