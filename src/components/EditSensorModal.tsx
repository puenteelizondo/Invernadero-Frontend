import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import { useDevices, useSensorTypesFor, useUpdateSensor, useZones } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Sensor } from "../types";
import { Button, ErrorText, Field, FormActions, Hint, Input, Label, Modal, Select } from "./ui";

type PersistMode = "never" | "always" | "interval";

function modeOf(s: Sensor): PersistMode {
  if (s.persist_interval_seconds == null) return "never";
  return s.persist_interval_seconds === 0 ? "always" : "interval";
}

/**
 * Edición completa de un sensor (PATCH /sensors/{id}/). No hay ningún
 * campo para escribir una lectura: eso solo llega desde el dispositivo.
 */
export function EditSensorModal({
  sensor,
  greenhouseId,
  onClose,
}: {
  sensor: Sensor | null;
  greenhouseId: number;
  onClose: () => void;
}) {
  const { data: types } = useSensorTypesFor(greenhouseId);
  const { data: devices } = useDevices(greenhouseId);
  const { data: zones } = useZones(greenhouseId);
  const update = useUpdateSensor(greenhouseId);

  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [readingInterval, setReadingInterval] = useState("60");
  const [mode, setMode] = useState<PersistMode>("never");
  const [persistSeconds, setPersistSeconds] = useState("60");
  const [deadband, setDeadband] = useState("");

  // Se vuelve a llenar cada vez que se abre con otro sensor.
  useEffect(() => {
    if (!sensor) return;
    setName(sensor.name);
    setTypeId(sensor.sensor_type);
    setDeviceId(sensor.device ?? "");
    setZoneId(sensor.zone ?? "");
    setUnit(sensor.unit);
    setDescription(sensor.description);
    setActive(sensor.is_active);
    setReadingInterval(String(sensor.reading_interval_seconds));
    setMode(modeOf(sensor));
    setPersistSeconds(String(sensor.persist_interval_seconds || 60));
    setDeadband(sensor.persist_deadband == null ? "" : String(sensor.persist_deadband));
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor?.id]);

  if (!sensor) return null;
  const current = sensor;
  const typeDefaultUnit = types?.find((t) => t.id === typeId)?.default_unit;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) return;
    update.mutate(
      {
        id: current.id,
        name,
        sensor_type: typeId,
        device: deviceId || null,
        zone: zoneId || null,
        unit,
        description,
        is_active: active,
        reading_interval_seconds: Number(readingInterval) || 60,
        persist_interval_seconds: mode === "never" ? null : mode === "always" ? 0 : Math.max(1, Number(persistSeconds) || 60),
        persist_deadband: mode === "interval" && deadband.trim() !== "" ? Number(deadband) : null,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Modal open onClose={onClose} title={`Editar sensor · ID ${current.id}`} icon={Cpu}>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field>
          <Label>Tipo de sensor</Label>
          <Select value={typeId} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")} required>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field>
            <Label>Dispositivo</Label>
            <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Sin asignar</option>
              {devices?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Zona</Label>
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Sin zona</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field>
            <Label>Unidad</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder={typeDefaultUnit} />
            <Hint>Vacío = la del tipo{typeDefaultUnit ? ` (${typeDefaultUnit})` : ""}.</Hint>
          </Field>
          <Field>
            <Label>Lectura esperada cada (seg)</Label>
            <Input type="number" min={1} value={readingInterval} onChange={(e) => setReadingInterval(e.target.value)} />
          </Field>
        </div>
        <Field>
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
          <Label>¿Qué se guarda en el historial?</Label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as PersistMode)}>
            <option value="never">Nada: solo tiempo real</option>
            <option value="always">Todas las lecturas</option>
            <option value="interval">Como máximo una cada N segundos</option>
          </Select>
          {mode === "interval" && (
            <div className="mt-3">
              <Label>Cada cuántos segundos</Label>
              <Input type="number" min={1} value={persistSeconds} onChange={(e) => setPersistSeconds(e.target.value)} />
            </div>
          )}
          <Hint>
            {mode === "never"
              ? "Las lecturas se muestran en vivo pero no se guardan en el historial."
              : mode === "always"
                ? "Cada lectura aceptada se guarda en el historial."
                : "La primera lectura siempre se guarda."}
          </Hint>
          {mode === "interval" && (
            <div className="mt-3">
              <Label>Guardar también si el valor cambia al menos</Label>
              <Input
                type="number"
                step="any"
                min={0}
                value={deadband}
                onChange={(e) => setDeadband(e.target.value)}
                placeholder="Sin umbral"
              />
              <Hint>Guarda antes de que pase el intervalo si el valor cambió tanto desde la última lectura guardada.</Hint>
            </div>
          )}
        </div>

        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Sensor activo (si se desactiva, el backend rechaza sus lecturas)
        </label>

        <ErrorText>{update.isError ? formatApiError(update.error) : null}</ErrorText>
        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!typeId}>
            Guardar cambios
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
