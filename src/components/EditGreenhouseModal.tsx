import { useEffect, useState } from "react";
import { Sprout, Trash2 } from "lucide-react";
import { useDeleteGreenhouse, useUpdateGreenhouse } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Greenhouse } from "../types";
import { Button, ConfirmDialog, ErrorText, Field, FormActions, Hint, Input, Label, Modal } from "./ui";

function allTimezones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

/**
 * Configuración de un invernadero: editar (PATCH) y eliminar (DELETE).
 * El backend solo lo permite a un Owner; si no lo eres, responde 403 y
 * aquí se muestra el mensaje.
 */
export function EditGreenhouseModal({
  greenhouse,
  open,
  onClose,
  onDeleted,
}: {
  greenhouse: Greenhouse;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const update = useUpdateGreenhouse(greenhouse.id);
  const remove = useDeleteGreenhouse(greenhouse.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [active, setActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(greenhouse.name);
    setDescription(greenhouse.description);
    setTimezone(greenhouse.timezone);
    setActive(greenhouse.is_active);
    update.reset();
    remove.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, greenhouse.id]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ name, description, timezone: timezone.trim() || "UTC", is_active: active }, { onSuccess: onClose });
  }

  return (
    <>
      <Modal open={open && !confirmDelete} onClose={onClose} title="Configurar invernadero" icon={Sprout}>
        <form onSubmit={onSubmit}>
          <Field>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <Hint>El nombre debe ser único.</Hint>
          </Field>
          <Field>
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field>
            <Label>Zona horaria</Label>
            <Input list="tz-list" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Mexico_City" />
            <datalist id="tz-list">
              {allTimezones().map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <Hint>Formato IANA, por ejemplo America/Mexico_City. Las lecturas siempre se guardan en UTC.</Hint>
          </Field>
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Invernadero activo
          </label>
          <ErrorText>{update.isError ? formatApiError(update.error) : null}</ErrorText>
          <FormActions>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={update.isPending}>
              Guardar cambios
            </Button>
          </FormActions>
        </form>

        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/60 p-4">
          <p className="text-sm font-semibold text-red-700">Zona de peligro</p>
          <p className="mt-1 text-xs text-red-600/80">
            Eliminar el invernadero no se puede deshacer. Si todavía tiene sensores, actuadores o dispositivos, no se
            dejará eliminar: primero elimínalos.
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Eliminar invernadero
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={open && confirmDelete}
        title={`Eliminar "${greenhouse.name}"`}
        message={
          remove.isError
            ? `No se pudo eliminar: ${formatApiError(remove.error)}`
            : "Se eliminará el invernadero con sus zonas y membresías. Esta acción no se puede deshacer."
        }
        confirmLabel="Sí, eliminar"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: onDeleted })}
        onCancel={() => {
          remove.reset();
          setConfirmDelete(false);
        }}
      />
    </>
  );
}
