import { useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useCreateZone, useDeleteZone, useUpdateZone, useZones } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { Layout } from "../components/Layout";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorText,
  Input,
  Label,
  Modal,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { ZonePlan } from "../components/ZonePlan";

/**
 * Zonas de un invernadero (ej. "Mesa 1", "Túnel norte"). Son opcionales
 * y solo sirven para agrupar sensores y actuadores dentro del mismo
 * invernadero -- se eligen desde el selector "Zona" al crear/editar un
 * sensor o actuador (ver SensorsPage/ActuatorsPage).
 */
export function ZonesPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: zones, isLoading } = useZones(greenhouseId);
  const createZone = useCreateZone(greenhouseId);
  const updateZone = useUpdateZone(greenhouseId);
  const deleteZone = useDeleteZone(greenhouseId);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toDelete, setToDelete] = useState<number | null>(null);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setOpen(true);
  }

  function openEdit(zoneId: number, currentName: string, currentDescription: string) {
    setEditingId(zoneId);
    setName(currentName);
    setDescription(currentDescription);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId != null) {
      updateZone.mutate(
        { id: editingId, name, description },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      createZone.mutate({ name, description }, { onSuccess: () => setOpen(false) });
    }
  }

  const pending = editingId != null ? updateZone : createZone;

  return (
    <Layout>
      <PageHeader
        icon={MapPin}
        title="Zonas"
        subtitle="Agrupa sensores y actuadores dentro de este invernadero (ej. mesas, túneles, secciones)."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Agregar zona
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-80 rounded-[1.75rem]" />
      ) : !zones?.length ? (
        <EmptyState title="Todavía no hay zonas" hint="Son opcionales -- puedes seguir creando sensores y actuadores sin asignarles una zona." />
      ) : (
        <ZonePlan
          greenhouseId={greenhouseId}
          zones={zones}
          onEdit={(z) => openEdit(z.id, z.name, z.description)}
          onDelete={(zoneId) => setToDelete(zoneId)}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId != null ? "Editar zona" : "Agregar zona"} icon={MapPin}>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="mb-4">
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <ErrorText>{pending.isError ? formatApiError(pending.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending.isPending}>
              {editingId != null ? "Guardar" : "Crear zona"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete != null}
        title="Eliminar zona"
        message="Los sensores y actuadores de esta zona quedarán sin zona asignada. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteZone.isPending}
        error={deleteZone.isError ? formatApiError(deleteZone.error) : null}
        onConfirm={() => {
          if (toDelete != null) deleteZone.mutate(toDelete, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => {
          deleteZone.reset();
          setToDelete(null);
        }}
      />
    </Layout>
  );
}
