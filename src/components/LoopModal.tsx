import { useEffect, useState } from "react";
import { Plus, Save, SlidersHorizontal } from "lucide-react";
import { useCreateLoop, useUpdateLoop } from "../hooks/useControl";
import { formatApiError } from "../lib/api";
import type { Actuator, ControlLoop, Device, Sensor, SensorType } from "../types";
import { toast } from "./Toaster";
import { Button, ErrorText, Field, FormActions, Hint, Input, Label, Modal, Select } from "./ui";

/** Crear o editar un lazo: elige la variable (sensor) y la salida (actuador) de un mismo dispositivo. */
export function LoopModal({
  open, onClose, greenhouseId, loop, sensors, actuators, devices, loops, sensorTypes, liveValue, initialDevice,
}: {
  open: boolean;
  onClose: () => void;
  greenhouseId: number;
  loop: ControlLoop | null;
  sensors: Sensor[];
  actuators: Actuator[];
  devices: Device[];
  loops: ControlLoop[];
  sensorTypes: SensorType[];
  liveValue: (sensorId: number) => number | null;
  /** Dispositivo preseleccionado al crear (el filtro de la página Control). */
  initialDevice?: number | null;
}) {
  const create = useCreateLoop(greenhouseId);
  const update = useUpdateLoop(greenhouseId);
  const [name, setName] = useState("");
  const [sensorId, setSensorId] = useState("");
  const [actuatorId, setActuatorId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const editing = loop != null;
  const mut = editing ? update : create;

  useEffect(() => {
    if (!open) return;
    mut.reset();
    setName(loop?.name ?? "");
    setSensorId(loop ? String(loop.sensor) : "");
    setActuatorId(loop ? String(loop.actuator) : "");
    const dev = loop?.device ?? initialDevice ?? (devices.length === 1 ? devices[0].id : null);
    setDeviceId(dev != null ? String(dev) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loop]);

  const deviceName = (id: number | null) => (id == null ? "sin dispositivo" : devices.find((d) => d.id === id)?.name ?? `#${id}`);
  const sensor = sensors.find((s) => String(s.id) === sensorId);
  const dev = deviceId ? Number(deviceId) : null;
  // Quién usa ya cada actuador (un actuador solo puede estar en un lazo).
  const usedBy = new Map(loops.filter((l) => l.id !== loop?.id).map((l) => [l.actuator, l.name]));

  // Primero se elige el DISPOSITIVO (el ESP32 que ejecuta el lazo); luego sensor y
  // actuador de ese dispositivo. Se muestran todos; los que no sirven quedan
  // deshabilitados con el motivo, en vez de esconderlos (si no, parece que "faltan").
  const whyNot = (itemDevice: number | null) =>
    itemDevice == null ? "sin dispositivo asignado" : dev != null && itemDevice !== dev ? `es de ${deviceName(itemDevice)}` : null;
  const sensorOptions = sensors.map((s) => ({ s, reason: dev == null ? null : whyNot(s.device) }));
  const options = actuators.map((a) => {
    const owner = usedBy.get(a.id);
    const reason = owner ? `ya lo usa el lazo “${owner}”` : dev == null ? null : whyNot(a.device);
    return { a, reason };
  });
  const compatible = options.filter((o) => !o.reason).map((o) => o.a);
  const freeSensors = sensorOptions.filter((o) => !o.reason).length;

  function initialSetpoint(): number {
    const live = sensor ? liveValue(sensor.id) : null;
    if (live != null) return Math.round(live * 10) / 10;
    const t = sensorTypes.find((x) => x.id === sensor?.sensor_type);
    if (t?.valid_min != null && t?.valid_max != null) return Math.round(((t.valid_min + t.valid_max) / 2) * 10) / 10;
    return 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sensor) return;
    if (editing && loop) {
      update.mutate(
        { id: loop.id, patch: { name: name.trim(), sensor: Number(sensorId), actuator: Number(actuatorId) } },
        { onSuccess: () => { toast("Lazo actualizado"); onClose(); } }
      );
    } else {
      create.mutate(
        { name: name.trim(), sensor: Number(sensorId), actuator: Number(actuatorId), setpoint: initialSetpoint() },
        { onSuccess: () => { toast("Lazo creado. Elige el modo para activarlo."); onClose(); } }
      );
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar lazo" : "Nuevo lazo de control"} icon={SlidersHorizontal}>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Temperatura de la nave" maxLength={100} autoFocus required />
        </Field>
        <Field>
          <Label>Dispositivo que controla (ESP32)</Label>
          <Select value={deviceId} onChange={(e) => { setDeviceId(e.target.value); setSensorId(""); setActuatorId(""); }} required>
            <option value="" disabled>{devices.length ? "Elegir dispositivo…" : "No hay dispositivos"}</option>
            {devices.map((d) => {
              const n = loops.filter((l) => l.device === d.id && l.id !== loop?.id).length;
              return (
                <option key={d.id} value={d.id}>
                  {d.name}{n ? ` · ${n} lazo${n > 1 ? "s" : ""}` : ""}
                </option>
              );
            })}
          </Select>
          {devices.length === 0 && (
            <Hint>Crea primero un dispositivo en la página Dispositivos y asígnale sus sensores y actuadores.</Hint>
          )}
        </Field>
        <Field>
          <Label>Variable que se mide (sensor)</Label>
          <Select value={sensorId} onChange={(e) => setSensorId(e.target.value)} disabled={!dev} required>
            <option value="" disabled>{dev ? "Elegir sensor…" : "Primero elige el dispositivo"}</option>
            {sensorOptions.map(({ s, reason }) => (
              <option key={s.id} value={s.id} disabled={!!reason}>
                {s.name} · {s.sensor_type_name}{reason ? ` — ${reason}` : ""}
              </option>
            ))}
          </Select>
          {dev && freeSensors === 0 && (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              “{deviceName(dev)}” no tiene sensores. Asígnale uno en la página del sensor (sección “Conectar este sensor”).
            </p>
          )}
        </Field>
        <Field>
          <Label>Salida que se maneja (actuador)</Label>
          <Select value={actuatorId} onChange={(e) => setActuatorId(e.target.value)} disabled={!dev} required>
            <option value="" disabled>{dev ? "Elegir actuador…" : "Primero elige el dispositivo"}</option>
            {options.map(({ a, reason }) => (
              <option key={a.id} value={a.id} disabled={!!reason}>
                {a.name} · {a.actuator_type_name}{reason ? ` — ${reason}` : ""}
              </option>
            ))}
          </Select>
          {dev && compatible.length === 0 && (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              “{deviceName(dev)}” no tiene actuadores libres. Cada actuador solo puede estar en un lazo: cambia o borra el
              lazo que lo usa, o asigna otro actuador a este dispositivo.
            </p>
          )}
          <Hint>Cada lazo es un sensor + un actuador del mismo dispositivo, y cada actuador solo puede estar en un lazo. Un mismo sensor sí puede usarse en varios lazos (por ejemplo, temperatura → calefactor y temperatura → ventilador).</Hint>
        </Field>
        <ErrorText>{mut.isError ? formatApiError(mut.error) : null}</ErrorText>
        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mut.isPending} disabled={!sensorId || !actuatorId || !name.trim()}>
            {editing ? <><Save className="h-4 w-4" /> Guardar</> : <><Plus className="h-4 w-4" /> Crear lazo</>}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
