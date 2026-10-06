import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Cpu, Info } from "lucide-react";
import type { Actuator, ControlLoop, Device, Sensor, SensorType } from "../types";
import { findActuatorPreset } from "../lib/actuatorPresets";
import { ADC1_PINS, OUTPUT_PINS, buildSettings, buildSketch, type FwActuator, type FwSensor } from "../lib/firmware";
import { ArduinoSteps, CodeView, ConnectTips, HostWarning, NetFields, useNetSettings } from "./FirmwareBits";
import { Card, Input, Select } from "./ui";

// Campos más bajos para las listas de sensores / actuadores.
const COMPACT = "!min-h-[36px] !py-1.5 !pl-2.5";

type SensorHw = Pick<FwSensor, "read" | "pin" | "min" | "max">;
type ActuatorHw = Pick<FwActuator, "pin" | "relay" | "activeLow">;

/**
 * Ejemplo del programa de Arduino (ESP32) para los lazos de un dispositivo,
 * con sus ids, pines y sensores ya puestos. Todo es local: los campos solo
 * cambian el texto del programa; no se guardan ni se mandan al servidor.
 *
 * Esto documenta cómo funciona el controlador; no es una forma de mandar
 * lecturas ni de calcular el PID en la web.
 */
export function ControlFirmwarePanel({
  loops,
  sensors,
  actuators,
  devices,
  sensorTypes,
  typeCodeById,
  actuatorTypeCodeById,
}: {
  loops: ControlLoop[];
  sensors: Sensor[];
  actuators: Actuator[];
  devices: Device[];
  sensorTypes: SensorType[];
  typeCodeById: Map<number, string>;
  actuatorTypeCodeById: Map<number, string>;
}) {
  const [open, setOpen] = useState(false);

  const deviceIds = useMemo(() => [...new Set(loops.map((l) => l.device))], [loops]);
  const [deviceId, setDeviceId] = useState<number | null>(deviceIds[0] ?? null);
  useEffect(() => {
    if (deviceId == null || !deviceIds.includes(deviceId)) setDeviceId(deviceIds[0] ?? null);
  }, [deviceIds, deviceId]);

  const [net, setNet] = useNetSettings();
  const [sensorHw, setSensorHw] = useState<Record<number, SensorHw>>({});
  const [actHw, setActHw] = useState<Record<number, ActuatorHw>>({});

  const device = devices.find((d) => d.id === deviceId);
  const devLoops = useMemo(() => loops.filter((l) => l.device === deviceId), [loops, deviceId]);
  const typeById = useMemo(() => new Map(sensorTypes.map((t) => [t.id, t])), [sensorTypes]);

  // Sensores: todos los activos del dispositivo (así también manda lecturas de los que no tienen lazo).
  const fwSensors: FwSensor[] = useMemo(() => {
    const ids = new Set(devLoops.map((l) => l.sensor));
    // Primero los que usa algún lazo; luego los que solo mandan lecturas.
    const list = sensors
      .filter((s) => (s.device === deviceId && s.is_active) || ids.has(s.id))
      .sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)) || a.name.localeCompare(b.name));
    return list.map((s, i) => {
      const t = typeById.get(s.sensor_type);
      const hw = sensorHw[s.id];
      return {
        id: s.id,
        name: s.name,
        unit: s.effective_unit,
        code: typeCodeById.get(s.sensor_type) ?? "",
        loops: devLoops.filter((l) => l.sensor === s.id).map((l) => l.name),
        read: hw?.read ?? "custom",
        pin: hw?.pin ?? ADC1_PINS[i % ADC1_PINS.length],
        min: hw?.min ?? t?.valid_min ?? 0,
        max: hw?.max ?? t?.valid_max ?? 100,
      };
    });
  }, [sensors, deviceId, devLoops, typeById, typeCodeById, sensorHw]);

  // Actuadores: los que manejan los lazos de este dispositivo.
  const fwActuators: FwActuator[] = useMemo(() => {
    const ids = [...new Set(devLoops.map((l) => l.actuator))];
    return ids.map((id, i) => {
      const a = actuators.find((x) => x.id === id);
      const code = a ? findActuatorPreset(actuatorTypeCodeById.get(a.actuator_type) ?? "", a.actuator_type_name)?.code : undefined;
      const hw = actHw[id];
      return {
        id,
        name: a?.name ?? devLoops.find((l) => l.actuator === id)?.actuator_name ?? `Actuador ${id}`,
        pin: hw?.pin ?? OUTPUT_PINS[i % OUTPUT_PINS.length],
        relay: hw?.relay ?? code !== "fan",
        activeLow: hw?.activeLow ?? false,
      };
    });
  }, [devLoops, actuators, actuatorTypeCodeById, actHw]);

  const options = {
    deviceName: device?.name ?? `Dispositivo ${deviceId}`,
    keyPrefix: device?.key_prefix ?? "",
    ...net,
    loopsCount: devLoops.length,
    sensors: fwSensors,
    actuators: fwActuators,
  };
  const settings = buildSettings(options);
  const sketch = buildSketch(options);

  const usedPins = [
    ...fwActuators.map((a) => a.pin),
    ...fwSensors.filter((s) => s.read === "analog").map((s) => s.pin),
  ];
  const dupPins = [...new Set(usedPins.filter((p, i) => usedPins.indexOf(p) !== i))];
  const pending = fwSensors.filter((s) => s.read === "custom" && s.loops.length > 0);

  if (!deviceIds.length) return null;

  return (
    <Card className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="firmware-panel"
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
          <Cpu className="h-5 w-5 text-brand-700" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-neutral-900">Programa para el ESP32 (Arduino)</span>
          <span className="block text-xs text-neutral-500">
            Ejemplo listo para Arduino IDE con tus lazos, sensores y actuadores ya puestos.
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-brand-600 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div id="firmware-panel" className="mt-5 space-y-5">
          <ArduinoSteps libs={<><b>WebSockets</b> (de Markus Sattler) y <b>ArduinoJson</b> (7.x)</>}>
            <li>
              Pega en <code>DEVICE_KEY</code> la API key de <b>{options.deviceName}</b>
              {device?.key_prefix ? <> (empieza con <code>{device.key_prefix}</code>)</> : null}. Solo se ve completa al
              crear o rotar el dispositivo, en la página Dispositivos.
            </li>
            <li>
              En <code>leerSensor()</code> escribe cómo se mide cada sensor marcado como “lo escribo yo”. Al subirlo, cada
              lazo dirá “Aplicado por el ESP32”.
            </li>
          </ArduinoSteps>

          {deviceIds.length > 1 && (
            <label className="block max-w-sm">
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">Dispositivo</span>
              <Select value={deviceId ?? ""} onChange={(e) => setDeviceId(Number(e.target.value))}>
                {deviceIds.map((id) => (
                  <option key={id} value={id}>
                    {devices.find((d) => d.id === id)?.name ?? `Dispositivo ${id}`}
                  </option>
                ))}
              </Select>
            </label>
          )}

          <NetFields net={net} onChange={setNet} />

          {/* Actuadores */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-neutral-800">Actuadores (salidas)</legend>
            <ul className="grid items-start gap-2 lg:grid-cols-2">
              {fwActuators.map((a) => {
                const set = (p: Partial<ActuatorHw>) =>
                  setActHw((m) => ({ ...m, [a.id]: { pin: a.pin, relay: a.relay, activeLow: a.activeLow, ...p } }));
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-neutral-200 px-3 py-2">
                    <p className="min-w-0 flex-1 basis-36 truncate text-sm font-medium text-neutral-900" title={a.name}>
                      {a.name} <span className="text-xs font-normal text-neutral-500">id {a.id}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-28">
                        <Select aria-label={`Pin de ${a.name}`} className={COMPACT} value={a.pin} onChange={(e) => set({ pin: Number(e.target.value) })}>
                          {OUTPUT_PINS.map((p) => <option key={p} value={p}>GPIO {p}</option>)}
                        </Select>
                      </div>
                      <div className="w-40">
                        <Select aria-label={`Tipo de salida de ${a.name}`} className={COMPACT} value={a.relay ? "relay" : "pwm"} onChange={(e) => set({ relay: e.target.value === "relay" })}>
                          <option value="relay">Relevador</option>
                          <option value="pwm">PWM (variable)</option>
                        </Select>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          checked={a.activeLow}
                          onChange={(e) => set({ activeLow: e.target.checked })}
                          className="h-4 w-4 accent-brand-600"
                        />
                        Activo en LOW
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-xs text-neutral-500">
              Muchos módulos de relevador se activan con LOW: si al encender el ESP32 el relevador se prende solo, marca
              “Activo en LOW”.
            </p>
          </fieldset>

          {/* Sensores */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-neutral-800">Sensores (cómo se miden)</legend>
            <ul className="grid items-start gap-2 lg:grid-cols-2">
              {fwSensors.map((s) => {
                const set = (p: Partial<SensorHw>) =>
                  setSensorHw((m) => ({ ...m, [s.id]: { read: s.read, pin: s.pin, min: s.min, max: s.max, ...p } }));
                const meta = `id ${s.id}${s.unit ? ` · ${s.unit}` : ""}${s.loops.length ? ` · lazo ${s.loops.join(", ")}` : ""}`;
                return (
                  <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2 ${s.loops.length ? "border-brand-300 bg-brand-50/40" : "border-neutral-200"}`}>
                    <p className="min-w-0 flex-1 basis-36 truncate text-sm font-medium text-neutral-900" title={`${s.name} · ${meta}`}>
                      {s.name} <span className="text-xs font-normal text-neutral-500">{meta}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-36">
                        <Select aria-label={`Cómo se lee ${s.name}`} className={COMPACT} value={s.read} onChange={(e) => set({ read: e.target.value as SensorHw["read"] })}>
                          <option value="custom">Lo escribo yo</option>
                          <option value="analog">Analógica</option>
                        </Select>
                      </div>
                      {s.read === "analog" && (
                        <>
                          <div className="w-28">
                            <Select aria-label={`Pin de ${s.name}`} className={COMPACT} value={s.pin} onChange={(e) => set({ pin: Number(e.target.value) })}>
                              {ADC1_PINS.map((p) => <option key={p} value={p}>GPIO {p}</option>)}
                            </Select>
                          </div>
                          <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-neutral-600">
                            0 V =
                            <span className="block w-20">
                              <Input aria-label={`Valor de ${s.name} en 0 V`} type="number" step="any" className={COMPACT} value={s.min} onChange={(e) => set({ min: Number(e.target.value) })} />
                            </span>
                          </label>
                          <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-neutral-600">
                            3.3 V =
                            <span className="block w-20">
                              <Input aria-label={`Valor de ${s.name} en 3.3 V`} type="number" step="any" className={COMPACT} value={s.max} onChange={(e) => set({ max: Number(e.target.value) })} />
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-xs text-neutral-500">
              Resaltados: los que usa un lazo. Analógica: solo GPIO 32–39 (los demás no funcionan con el WiFi encendido); la
              conversión es lineal, ajusta los valores de 0 V y 3.3 V al calibrar.
            </p>
          </fieldset>

          {/* Avisos */}
          <div className="space-y-2">
            <HostWarning host={net.host} />
            {dupPins.length > 0 && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>El pin {dupPins.join(", ")} está repetido. Cada actuador y cada sensor analógico necesita su propio pin.</span>
              </p>
            )}
            {pending.length > 0 && (
              <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {pending.map((s) => s.name).join(", ")}: hasta que escribas cómo se mide{pending.length > 1 ? "n" : ""}, su
                  lazo deja la salida en 0 por seguridad.
                </span>
              </p>
            )}
            <ConnectTips
              port={net.port}
              extra={<>Si agregas un lazo con otro actuador, vuelve a generar el programa (su pin tiene que estar en <code>HW[]</code>).</>}
            />
          </div>

          {/* Código */}
          <CodeView
            settings={settings}
            full={sketch}
            filename="esp32_control"
            note="El PID se calcula en el ESP32: desde esta página solo cambias el setpoint y las ganancias, y el programa las recibe al momento. Si se cae la red, sigue controlando con la última configuración guardada."
          />
        </div>
      )}
    </Card>
  );
}
