import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Cable, Info } from "lucide-react";
import { useDevices, useUpdateActuator } from "../hooks/useGreenhouses";
import { useControlLoops } from "../hooks/useControl";
import { OUTPUT_PINS } from "../lib/firmware";
import { buildActuatorSketch } from "../lib/firmwareSimple";
import { ArduinoSteps, CodeView, ConnectTips, HostWarning, NetFields, useNetSettings } from "./FirmwareBits";
import { formatApiError } from "../lib/api";
import type { Actuator } from "../types";
import { CopyButton } from "./CopyButton";
import { Button, Card, ErrorText, Select } from "./ui";

/**
 * Datos para conectar un actuador físico (relé, bomba, ventilador...) con
 * el sistema: su `actuator_id`, a qué dispositivo pertenece y el programa
 * del ESP32.
 *
 * El ESP32 entra con la clave de SU dispositivo (X-Device-Key) y abre el
 * WebSocket /ws/device/: al conectarse recibe el estado actual de sus
 * actuadores y, cada vez que alguien cambia uno en la página
 * (POST /actuators/{id}/state/, rol Owner u Operator), el servidor le avisa
 * al instante. Por eso el actuador TIENE que estar asignado a un dispositivo.
 */
export function ActuatorConnectPanel({ actuator, greenhouseId }: { actuator: Actuator; greenhouseId: number }) {
  const { data: devices } = useDevices(greenhouseId);
  const { data: loops } = useControlLoops(greenhouseId);
  const updateActuator = useUpdateActuator(greenhouseId);
  const [deviceId, setDeviceId] = useState<number | "">(actuator.device ?? "");

  const [net, setNet] = useNetSettings();
  const [pin, setPin] = useState(26);
  const [activeLow, setActiveLow] = useState(false);
  const myLoops = (loops ?? []).filter((l) => l.actuator === actuator.id);
  const device = devices?.find((d) => d.id === actuator.device);

  const sketch = buildActuatorSketch({
    ...net,
    deviceName: device?.name ?? "",
    keyPrefix: device?.key_prefix ?? "",
    actuatorId: actuator.id,
    actuatorName: actuator.name,
    pin,
    activeLow,
  });

  const http = `# Encender / apagar (usuario con rol Owner u Operator)
POST /api/v1/actuators/${actuator.id}/state/
Authorization: Basic <usuario:contraseña en base64>   (o sesión + X-CSRFToken)
Content-Type: application/json

{ "state": true }

# Lo que recibe el ESP32 por su WebSocket (/ws/device/), al instante:
{"event": "actuator_state", "actuator_id": ${actuator.id}, "state": true}
# y al conectarse, el estado actual de todos los actuadores de su dispositivo:
{"event": "actuators", "actuators": [{"id": ${actuator.id}, "state": false}]}`;

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">ID del actuador (actuator_id)</p>
          <p className="font-mono text-4xl font-bold text-brand-900">{actuator.id}</p>
        </div>
        <CopyButton text={String(actuator.id)} label="Copiar ID" className="border border-brand-200 bg-surface" />
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          El ESP32 entra con la <b>clave de su dispositivo</b> (no con la contraseña de una persona) y se queda
          conectado: cuando cambias el interruptor en esta página, <b>le llega al instante</b>.
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

      {/* Programa */}
      <div className="mb-4 space-y-4 rounded-2xl border border-neutral-200 p-4">
        <div>
          <h3 className="font-semibold text-neutral-900">Programa para el ESP32 (Arduino)</h3>
          <p className="text-xs text-neutral-500">
            Enciende o apaga un pin al instante según el interruptor de esta página. Llena los campos y el código se arma
            solo.
          </p>
        </div>

        {myLoops.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Este actuador lo maneja el lazo {myLoops.map((l) => `“${l.name}”`).join(", ")}. Usa el programa de la
              página <Link to={`/greenhouses/${greenhouseId}/control`} className="font-semibold underline">Control</Link>:
              ahí el ESP32 calcula la salida. Este programa es para manejarlo solo a mano.
            </span>
          </p>
        )}

        {!actuator.device && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Primero elige arriba el <b>dispositivo al que pertenece</b> y guarda: el ESP32 usa la clave de ese
              dispositivo y solo recibe órdenes de sus propios actuadores.
            </span>
          </p>
        )}

        <ArduinoSteps libs={<><b>WebSockets</b> (de Markus Sattler) y <b>ArduinoJson</b></>}>
          <li>
            Pega en <code>DEVICE_KEY</code> la clave de{" "}
            <b>{device ? `${device.name} (empieza con ${device.key_prefix})` : "su dispositivo"}</b>. Si no la tienes,
            genérala en <Link to={`/greenhouses/${greenhouseId}/devices`} className="font-semibold underline">Dispositivos</Link>.
          </li>
        </ArduinoSteps>

        <NetFields net={net} onChange={setNet} />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-neutral-800">Salida</legend>
          <div className="grid items-end gap-3 sm:grid-cols-[8rem_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Pin (GPIO)</span>
              <Select value={pin} onChange={(e) => setPin(Number(e.target.value))}>
                {OUTPUT_PINS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </label>
            <label className="flex min-h-[42px] items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={activeLow} onChange={(e) => setActiveLow(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Activo en LOW
            </label>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Muchos módulos de relevador se activan con LOW: si al encender el ESP32 el relevador se prende solo, marca
            “Activo en LOW”.
          </p>
        </fieldset>

        <HostWarning host={net.host} />
        <ConnectTips port={net.port} />

        <CodeView settings={sketch.settings} full={sketch.full} filename="actuador_invernadero" />
      </div>

      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">Ver cómo funciona por dentro (HTTP y WebSocket)</summary>
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
