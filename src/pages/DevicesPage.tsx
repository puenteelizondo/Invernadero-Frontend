import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cpu, KeyRound, Plus, RefreshCw, Router, ToggleLeft, Trash2 } from "lucide-react";
import {
  useActuators,
  useCreateDevice,
  useDeleteDevice,
  useDevices,
  useRotateDeviceKey,
  useSensors,
} from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { STATUS_BADGE, STATUS_LABEL, deviceStatus, timeAgo } from "../lib/deviceStatus";
import { Layout } from "../components/Layout";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { CopyButton } from "../components/CopyButton";
import { DeviceGauge } from "../components/DeviceGauge";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorText,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
} from "../components/ui";

/**
 * Dispositivos (controladores físicos) de un invernadero. Cada uno
 * tiene una API key con la que manda lecturas por su cuenta
 * (POST /api/v1/readings/ingest/ con header X-Device-Key) -- por eso
 * esta página nunca permite escribir una lectura a mano.
 *
 * La clave completa (`api_key`) solo viene en la respuesta de crear o
 * rotar, una sola vez; después el backend solo expone `key_prefix`.
 */
export function DevicesPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: devices, isLoading } = useDevices(greenhouseId);
  const { data: sensors } = useSensors(greenhouseId);
  const { data: actuators } = useActuators(greenhouseId);
  const createDevice = useCreateDevice(greenhouseId);
  const rotateKey = useRotateDeviceKey(greenhouseId);
  const deleteDevice = useDeleteDevice(greenhouseId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [toRotate, setToRotate] = useState<number | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ deviceName: string; apiKey: string } | null>(null);

  const countsByDevice = useMemo(() => {
    const m = new Map<number, { sensors: number; actuators: number }>();
    for (const s of sensors ?? []) if (s.device != null) m.set(s.device, { sensors: (m.get(s.device)?.sensors ?? 0) + 1, actuators: m.get(s.device)?.actuators ?? 0 });
    for (const a of actuators ?? []) if (a.device != null) m.set(a.device, { sensors: m.get(a.device)?.sensors ?? 0, actuators: (m.get(a.device)?.actuators ?? 0) + 1 });
    return m;
  }, [sensors, actuators]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    createDevice.mutate(
      { name },
      {
        onSuccess: (device) => {
          setOpen(false);
          setName("");
          if (device.api_key) setRevealedKey({ deviceName: device.name, apiKey: device.api_key });
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={Router}
        title="Dispositivos"
        subtitle="Cada controlador físico manda sus propias lecturas con su API key -- aquí administras los dispositivos, sus claves y qué sensores lleva cada uno."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Agregar dispositivo
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !devices?.length ? (
        <EmptyState
          title="Todavía no hay dispositivos"
          hint="Agrega uno para obtener una API key y empezar a mandar lecturas desde el controlador físico."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => {
            const status = deviceStatus(d);
            const counts = countsByDevice.get(d.id);
            return (
              <Card
                key={d.id}
                className={`relative overflow-hidden transition duration-300 ${
                  status === "online" ? "border-emerald-200 bg-surface" : "bg-surface"
                }`}
              >
                <div className="absolute right-3 top-3 flex gap-1">
                  <button
                    onClick={() => setToRotate(d.id)}
                    className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-brand-50 hover:text-brand-700"
                    title="Rotar clave"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(d.id)}
                    className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Link to={`/greenhouses/${greenhouseId}/devices/${d.id}`} className="mb-3 flex items-center gap-3 pr-14">
                  <DeviceGauge name={d.name} status={status} size={68} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{d.name}</p>
                    <p className="flex items-center gap-1 text-xs text-neutral-500">
                      <KeyRound className="h-3 w-3" /> {d.key_prefix}…
                    </p>
                    <span className="mt-1 inline-flex max-w-full items-center rounded-md bg-brand-50 pl-1.5 font-mono text-[11px] font-medium text-brand-700">
                      ID {d.id}
                      <CopyButton text={String(d.id)} className="!px-1 !py-0.5" />
                    </span>
                  </div>
                </Link>

                <div className="flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${STATUS_BADGE[status]}`}>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        status === "online" ? "animate-pulse bg-emerald-500" : status === "idle" ? "bg-amber-500" : "bg-neutral-400"
                      }`}
                    />
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-neutral-500">{d.last_seen_at ? timeAgo(d.last_seen_at) : ""}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-brand-50 pt-3 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5" /> {counts?.sensors ?? 0} sensor{(counts?.sensors ?? 0) === 1 ? "" : "es"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ToggleLeft className="h-3.5 w-3.5" /> {counts?.actuators ?? 0} actuador{(counts?.actuators ?? 0) === 1 ? "" : "es"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Agregar dispositivo" icon={Router}>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <Label>Nombre del dispositivo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ESP32-Zona-Norte" autoFocus required />
            <p className="mt-1 text-xs text-neutral-500">
              Si el nombre incluye "Arduino" o "Raspberry", se dibuja esa placa; si no, un ESP32.
            </p>
          </div>
          <ErrorText>{createDevice.isError ? formatApiError(createDevice.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createDevice.isPending}>
              Crear dispositivo
            </Button>
          </div>
        </form>
      </Modal>

      <ApiKeyModal
        open={revealedKey != null}
        deviceName={revealedKey?.deviceName ?? ""}
        apiKey={revealedKey?.apiKey ?? ""}
        onClose={() => setRevealedKey(null)}
      />

      <ConfirmDialog
        open={toRotate != null}
        title="Rotar API key"
        message="La clave actual dejará de funcionar de inmediato -- el controlador físico necesitará la nueva para seguir mandando lecturas."
        confirmLabel="Rotar clave"
        danger
        loading={rotateKey.isPending}
        onConfirm={() => {
          if (toRotate == null) return;
          rotateKey.mutate(toRotate, {
            onSuccess: (device) => {
              setToRotate(null);
              if (device.api_key) setRevealedKey({ deviceName: device.name, apiKey: device.api_key });
            },
          });
        }}
        onCancel={() => setToRotate(null)}
      />

      <ConfirmDialog
        open={toDelete != null}
        title="Eliminar dispositivo"
        message="Se eliminará el dispositivo y su clave dejará de ser válida. Los sensores/actuadores que lo tenían asignado quedarán sin dispositivo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteDevice.isPending}
        error={deleteDevice.isError ? formatApiError(deleteDevice.error) : null}
        onConfirm={() => {
          if (toDelete != null) deleteDevice.mutate(toDelete, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => {
          deleteDevice.reset();
          setToDelete(null);
        }}
      />
    </Layout>
  );
}
