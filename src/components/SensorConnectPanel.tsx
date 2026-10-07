import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Cable, Info } from "lucide-react";
import { useDevices, useSensorTypeCodeMap, useSensorTypes, useUpdateSensor } from "../hooks/useGreenhouses";
import { useControlLoops } from "../hooks/useControl";
import { buildSensorSketch } from "../lib/firmwareSimple";
import { ArduinoSteps, CodeView, ConnectTips, HostWarning, NetFields, SensorReadFields, useNetSettings, type SensorReadValue } from "./FirmwareBits";
import { formatApiError } from "../lib/api";
import type { Sensor } from "../types";
import { CopyButton } from "./CopyButton";
import { Button, Card, ErrorText, Input, Select } from "./ui";

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
  const { data: sensorTypes } = useSensorTypes();
  const typeCodeById = useSensorTypeCodeMap();
  const { data: loops } = useControlLoops(greenhouseId);
  const updateSensor = useUpdateSensor(greenhouseId);
  const [deviceId, setDeviceId] = useState<number | "">(sensor.device ?? "");

  const device = devices?.find((d) => d.id === sensor.device);

  const [net, setNet] = useNetSettings();
  const type = sensorTypes?.find((x) => x.id === sensor.sensor_type);
  const [readHw, setReadHw] = useState<SensorReadValue>({
    // Por defecto, valor de prueba: copiar, pegar y ver llegar lecturas sin cablear nada.
    read: "test",
    pin: 34,
    min: type?.valid_min ?? 0,
    max: type?.valid_max ?? 100,
  });
  const [intervalS, setIntervalS] = useState(Math.max(1, sensor.reading_interval_seconds || 10));
  const myLoops = (loops ?? []).filter((l) => l.sensor === sensor.id);

  const sketch = buildSensorSketch({
    ...net,
    deviceName: device?.name ?? "",
    keyPrefix: device?.key_prefix ?? "",
    sensorId: sensor.id,
    sensorName: sensor.name,
    unit: sensor.effective_unit,
    code: typeCodeById.get(sensor.sensor_type) ?? "",
    intervalMs: intervalS * 1000,
    ...readHw,
  });

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

      {/* Programa */}
      <div className="mb-4 space-y-4 rounded-2xl border border-neutral-200 p-4">
        <div>
          <h3 className="font-semibold text-neutral-900">Programa para el ESP32 (Arduino)</h3>
          <p className="text-xs text-neutral-500">Manda las lecturas de este sensor cada cierto tiempo. Llena los campos y el código se arma solo.</p>
        </div>

        {myLoops.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Este sensor está en el lazo {myLoops.map((l) => `“${l.name}”`).join(", ")}. Un ESP32 solo puede tener un
              programa: usa el de la página{" "}
              <Link to={`/greenhouses/${greenhouseId}/control`} className="font-semibold underline">Control</Link>, que
              ya manda las lecturas de este sensor y además controla el actuador.
            </span>
          </p>
        )}

        <ArduinoSteps libs={null}>
          <li>
            Pega en <code>DEVICE_KEY</code> la API key de {device ? <b>{device.name}</b> : "su dispositivo"}
            {device?.key_prefix ? <> (empieza con <code>{device.key_prefix}</code>)</> : null}. Solo se ve completa al
            crear o rotar el dispositivo.
          </li>
          {readHw.read === "custom" && <li>En <code>leerSensor()</code> escribe cómo se mide (hay ejemplos en el código).</li>}
        </ArduinoSteps>

        <NetFields net={net} onChange={setNet} />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-neutral-800">Cómo se mide</legend>
          <div className="flex flex-wrap items-end gap-2">
            <SensorReadFields value={readHw} onChange={(p) => setReadHw((v) => ({ ...v, ...p }))} />
            <label className="block w-36">
              <span className="mb-1 block text-xs text-neutral-600">Cada cuántos segundos</span>
              <Input type="number" min={1} value={intervalS} onChange={(e) => setIntervalS(Math.max(1, Number(e.target.value) || 1))} />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Para entradas analógicas solo se ofrecen los GPIO 32–39: los demás no funcionan con el WiFi encendido.
          </p>
        </fieldset>

        <HostWarning host={net.host} />
        <ConnectTips port={net.port} />

        <CodeView
          settings={sketch.settings}
          full={sketch.full}
          filename="sensor_invernadero"
          note={<>Un Arduino sin WiFi (Uno/Nano) no puede mandar lecturas solo: necesita un ESP32 o un módulo WiFi.</>}
        />
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
