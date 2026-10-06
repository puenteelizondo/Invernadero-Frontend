import { useState } from "react";
import { AlertTriangle, Cable, Info } from "lucide-react";
import { useDevices, useUpdateSensor } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Sensor } from "../types";
import { CopyButton } from "./CopyButton";
import { Button, Card, ErrorText, Select } from "./ui";

/**
 * Todo lo que hace falta para que un controlador físico (Arduino/ESP32)
 * mande lecturas de ESTE sensor: su `sensor_id`, a qué dispositivo debe
 * pertenecer, y un ejemplo de código listo para copiar.
 *
 * Reglas del backend que conviene decir en voz alta (ver README,
 * POST /readings/ingest/): el sensor debe existir, estar activo y
 * pertenecer al dispositivo cuya API key viaja en X-Device-Key. La clave
 * completa solo se ve al crear o rotar el dispositivo (Dispositivos);
 * aquí solo se muestra su prefijo.
 *
 * Esto NO es una forma de escribir una lectura a mano: la página solo
 * documenta cómo la manda el hardware.
 */
export function SensorConnectPanel({ sensor, greenhouseId }: { sensor: Sensor; greenhouseId: number }) {
  const { data: devices } = useDevices(greenhouseId);
  const updateSensor = useUpdateSensor(greenhouseId);
  const [deviceId, setDeviceId] = useState<number | "">(sensor.device ?? "");

  const device = devices?.find((d) => d.id === sensor.device);
  const intervalMs = Math.max(1, sensor.reading_interval_seconds || 10) * 1000;

  const code = `#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID  = "TU_WIFI";
const char* WIFI_PASS  = "TU_PASSWORD";

// Dirección del backend: la IP de la computadora donde corre (ipconfig) y el puerto 8000.
const char* URL        = "http://<IP-DE-TU-PC>:8000/api/v1/readings/ingest/";

// API key completa del dispositivo (se ve una sola vez al crearlo o rotarla).
const char* DEVICE_KEY = "PEGA_AQUI_LA_API_KEY_DEL_DISPOSITIVO";

// ID de ESTE sensor en el sistema.
const int SENSOR_ID = ${sensor.id};

const unsigned long INTERVALO_MS = ${intervalMs};

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void enviarLectura(float valor) {
  HTTPClient http;
  http.begin(URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  String body = "{\\"sensor_id\\":" + String(SENSOR_ID) + ",\\"value\\":" + String(valor, 2) + "}";
  int status = http.POST(body);

  Serial.println(status);            // 200 = llegó bien
  Serial.println(http.getString());  // detalle: accepted / persisted / rejected
  http.end();
}

void loop() {
  float valor = 0; // <- aquí lee tu sensor real
  enviarLectura(valor);
  delay(INTERVALO_MS);
}`;

  const json = `POST /api/v1/readings/ingest/
X-Device-Key: <api key del dispositivo>
Content-Type: application/json

{ "sensor_id": ${sensor.id}, "value": 24.5 }`;

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
          <Cable className="h-5 w-5 text-brand-700" />
        </span>
        <div>
          <h2 className="font-semibold text-neutral-900">Conectar este sensor</h2>
          <p className="text-xs text-neutral-500">Lo que tu Arduino/ESP32 necesita para mandar lecturas de aquí.</p>
        </div>
      </div>

      {/* ID grande */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">ID del sensor (sensor_id)</p>
          <p className="font-mono text-4xl font-bold text-brand-900">{sensor.id}</p>
        </div>
        <CopyButton text={String(sensor.id)} label="Copiar ID" className="border border-brand-200 bg-surface" />
      </div>

      {/* Avisos que evitan el "no me llega nada" */}
      <div className="mb-4 space-y-2">
        {!sensor.device && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este sensor <b>no tiene dispositivo asignado</b>: el backend rechazará sus lecturas con "este sensor no
              está asignado a tu dispositivo". Asígnalo abajo.
            </span>
          </p>
        )}
        {!sensor.is_active && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>El sensor está <b>inactivo</b>: la ingesta lo rechaza hasta que lo actives.</span>
          </p>
        )}
        {sensor.persist_interval_seconds == null && (
          <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este sensor no tiene <code>persist_interval_seconds</code> configurado, así que sus lecturas se ven en
              vivo pero <b>no se guardan</b> en el historial.
            </span>
          </p>
        )}
      </div>

      {/* Dispositivo */}
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
            loading={updateSensor.isPending}
            disabled={(deviceId || null) === sensor.device}
            onClick={() => updateSensor.mutate({ id: sensor.id, device: deviceId || null })}
          >
            Guardar
          </Button>
        </div>
        <ErrorText>{updateSensor.isError ? formatApiError(updateSensor.error) : null}</ErrorText>
        <p className="mt-1.5 text-xs text-neutral-500">
          {device ? (
            <>
              La API key de <b>{device.name}</b> empieza con <code>{device.key_prefix}</code>. La clave completa solo se
              muestra al crear o rotar el dispositivo (página Dispositivos).
            </>
          ) : (
            <>Si aún no tienes dispositivo, créalo en la página Dispositivos: ahí se muestra su API key (una sola vez).</>
          )}
        </p>
      </div>

      {/* Código */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">Ejemplo para Arduino IDE (ESP32)</p>
          <CopyButton text={code} label="Copiar código" />
        </div>
        <pre className="max-h-80 overflow-auto rounded-xl bg-neutral-900 p-4 text-xs leading-relaxed text-emerald-100">
          <code>{code}</code>
        </pre>
        <p className="mt-1.5 text-xs text-neutral-500">
          Si el backend responde <code>400</code> al probar desde otra máquina, agrega la IP de tu PC a{" "}
          <code>DJANGO_ALLOWED_HOSTS</code> en el <code>.env</code> del backend. Un Arduino sin WiFi (Uno/Nano) no
          puede hacer esta petición por sí solo: necesita un ESP32/ESP8266 o un módulo WiFi.
        </p>
      </div>

      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">Ver la petición HTTP cruda</summary>
        <div className="mt-2 flex items-start justify-between gap-2">
          <pre className="flex-1 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-emerald-100">
            <code>{json}</code>
          </pre>
          <CopyButton text={json} />
        </div>
      </details>
    </Card>
  );
}
