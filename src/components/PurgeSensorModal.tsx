import { useEffect, useState } from "react";
import { usePurgeActuator, usePurgeSensor } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Button, ErrorText, Field, FormActions, Hint, Input, Label, Modal } from "./ui";
import { Trash2 } from "lucide-react";

/**
 * Borrado de un sensor (o, con kind="actuator", de un actuador) junto con
 * TODO su historial: lecturas guardadas / cambios de estado. Hay que
 * escribir el nombre exacto, igual que al borrar un repositorio.
 * Irreversible; solo el Owner del invernadero puede (si no, el backend
 * responde 403 y se muestra aquí).
 */
export function PurgeSensorModal({
  sensor,
  greenhouseId,
  onClose,
  onDone,
  kind = "sensor",
}: {
  kind?: "sensor" | "actuator";
  sensor: { id: number; name: string } | null;
  greenhouseId: number;
  onClose: () => void;
  onDone?: () => void;
}) {
  const purgeSensor = usePurgeSensor(greenhouseId);
  const purgeActuator = usePurgeActuator(greenhouseId);
  const purge = kind === "actuator" ? purgeActuator : purgeSensor;
  const noun = kind === "actuator" ? "actuador" : "sensor";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    purge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor?.id]);

  if (!sensor) return null;
  const target = sensor;
  const matches = typed.trim() === target.name;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    purge.mutate(
      { id: target.id, confirm_name: typed.trim() },
      {
        onSuccess: () => {
          onClose();
          onDone?.();
        },
      }
    );
  }

  return (
    <Modal open onClose={onClose} title={`Eliminar ${noun} y su historial`} icon={Trash2} tone="danger">
      <form onSubmit={onSubmit}>
        <p className="mb-3 text-sm leading-relaxed text-neutral-600">
          Se borrarán <b>{target.name}</b> y{" "}
          <b>{kind === "actuator" ? "todo su historial de encendidos y apagados" : "todas sus lecturas guardadas"}</b>. Esto
          no se puede deshacer.{kind === "sensor" ? " Esos datos ya no saldrán en gráficas ni en el Excel." : ""}
        </p>
        <Field>
          <Label>Escribe el nombre del {noun} para confirmar</Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={target.name} autoFocus />
          <Hint>Debe coincidir exactamente: {target.name}</Hint>
        </Field>
        <ErrorText>{purge.isError ? formatApiError(purge.error) : null}</ErrorText>
        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={purge.isPending} disabled={!matches}>
            Eliminar todo
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
