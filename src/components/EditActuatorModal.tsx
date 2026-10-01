import { useEffect, useState } from "react";
import { ToggleLeft } from "lucide-react";
import { useActuatorTypesFor, useDevices, useUpdateActuator, useZones } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Actuator } from "../types";
import { Button, ErrorText, Field, FormActions, Hint, Input, Label, Modal, Select } from "./ui";

/**
 * Edición completa de un actuador (PATCH /actuators/{id}/). El estado
 * encendido/apagado NO se edita aquí: el backend lo ignora en el PATCH y
 * solo cambia con POST /actuators/{id}/state/ (el interruptor del panel).
 */
export function EditActuatorModal({
  actuator,
  greenhouseId,
  onClose,
}: {
  actuator: Actuator | null;
  greenhouseId: number;
  onClose: () => void;
}) {
  const { data: types } = useActuatorTypesFor(greenhouseId);
  const { data: devices } = useDevices(greenhouseId);
  const { data: zones } = useZones(greenhouseId);
  const update = useUpdateActuator(greenhouseId);

  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!actuator) return;
    setName(actuator.name);
    setTypeId(actuator.actuator_type);
    setDeviceId(actuator.device ?? "");
    setZoneId(actuator.zone ?? "");
    setDescription(actuator.description);
    setActive(actuator.is_active);
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actuator?.id]);

  if (!actuator) return null;
  const current = actuator;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) return;
    update.mutate(
      {
        id: current.id,
        name,
        actuator_type: typeId,
        device: deviceId || null,
        zone: zoneId || null,
        description,
        is_active: active,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Modal open onClose={onClose} title={`Editar actuador · ID ${current.id}`} icon={ToggleLeft}>
      <form onSubmit={onSubmit}>
        <Field>
          <Label>Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field>
          <Label>Tipo de actuador</Label>
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
        <Field>
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          <Hint>El encendido y apagado se maneja con el interruptor, no desde este formulario.</Hint>
        </Field>
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Actuador activo
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
