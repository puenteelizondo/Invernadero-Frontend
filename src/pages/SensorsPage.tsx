import { useMemo, useState } from "react";
import { ActiveAlertsBanner } from "../components/ActiveAlertsBanner";
import { useActiveAlerts } from "../hooks/useAlerts";
import type { Sensor } from "../types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BellPlus, Cpu, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import {
  useCreateSensor,
  useCreateSensorType,
  useDeleteSensor,
  useUpdateSensor,
  useDevices,
  useSensorTypeCodeMap,
  useSensorTypesFor,
  useCanManageGreenhouse,
  useSensors,
  useZones,
} from "../hooks/useGreenhouses";
import { useMe } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { SENSOR_PRESETS, findSensorPreset, type SensorPreset } from "../lib/sensorPresets";
import { formatApiError } from "../lib/api";
import { Layout } from "../components/Layout";
import { SensorGauge } from "../components/SensorGauge";
import { EditSensorModal } from "../components/EditSensorModal";
import { PurgeSensorModal } from "../components/PurgeSensorModal";
import { NewTypeInline } from "../components/NewTypeInline";
import { LiveSparkline } from "../components/LiveSparkline";
import { CopyButton } from "../components/CopyButton";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";

/**
 * Alta y catálogo de sensores de un invernadero.
 *
 * A propósito NO existe en esta página (ni en ninguna otra de este
 * frontend) una forma de escribir una lectura a mano: las lecturas las
 * manda el controlador físico del sensor con su propia API key
 * (POST /api/v1/readings/, autenticado con X-Device-Key). Aquí solo se
 * crean/eliminan sensores.
 *
 * Cada sensor se muestra separado, en su propio panel, con su ícono
 * "vivo" (se mueve solo según el tipo y destella con cada lectura) y
 * una mini-gráfica que crece en tiempo real con lo que llega por
 * WebSocket -- ver useRealtime (`series`) y LiveSparkline.
 */
export function SensorsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const greenhouseId = Number(id);
  const { data: activeAlerts } = useActiveAlerts(greenhouseId);
  const alertingSensors = new Set((activeAlerts?.results ?? []).map((a) => a.sensor));
  const { data: me } = useMe();
  const { data: sensors, isLoading } = useSensors(greenhouseId);
  const { data: sensorTypes } = useSensorTypesFor(greenhouseId);
  const canManage = useCanManageGreenhouse(greenhouseId);
  const typeCodeById = useSensorTypeCodeMap();
  const { data: devices } = useDevices(greenhouseId);
  const { data: zones } = useZones(greenhouseId);
  const { status, snapshot, series } = useRealtime(greenhouseId);
  const createSensor = useCreateSensor(greenhouseId);
  const createSensorType = useCreateSensorType();
  const deleteSensor = useDeleteSensor(greenhouseId);
  const updateSensor = useUpdateSensor(greenhouseId);

  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<SensorPreset | null>(null);
  // "Otro tipo": sin preset, eligiendo cualquier tipo del catálogo (incluidos los creados por el staff).
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [sensorTypeId, setSensorTypeId] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [editing, setEditing] = useState<Sensor | null>(null);
  const [purging, setPurging] = useState<{ id: number; name: string } | null>(null);
  const [created, setCreated] = useState<{ id: number; name: string; device: number | null } | null>(null);

  // Un preset "cuenta" como usable si ya existe un SensorType con ese
  // código en el catálogo real del backend.
  const existingByCode = useMemo(() => new Map(sensorTypes?.map((t) => [t.code, t])), [sensorTypes]);
  const typeById = useMemo(() => new Map(sensorTypes?.map((t) => [t.id, t])), [sensorTypes]);
  const liveBySensor = new Map(snapshot?.sensors.map((s) => [s.sensor_id, s]));

  function resetForm() {
    setPreset(null);
    setCustom(false);
    setName("");
    setSensorTypeId("");
    setDeviceId("");
    setZoneId("");
  }

  async function choosePreset(p: SensorPreset) {
    setPreset(p);
    const existing = existingByCode.get(p.code);
    if (existing) {
      setSensorTypeId(existing.id);
      setName((n) => n || existing.name);
      return;
    }
    if (me?.is_staff || canManage) {
      // Se siembra el tipo con un clic usando los valores del preset. El staff lo crea GLOBAL
      // (lo ven todos); el dueño de un invernadero lo crea PROPIO de ese invernadero.
      const created = await createSensorType.mutateAsync({
        code: p.code,
        name: p.name,
        default_unit: p.default_unit,
        valid_min: p.valid_min,
        valid_max: p.valid_max,
        description: p.description,
        greenhouse: me?.is_staff ? null : greenhouseId,
      });
      setSensorTypeId(created.id);
      setName((n) => n || created.name);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sensorTypeId) return;
    createSensor.mutate(
      {
        name,
        sensor_type: sensorTypeId,
        device: deviceId || null,
        zone: zoneId || null,
      },
      {
        onSuccess: (sensor) => {
          setOpen(false);
          resetForm();
          setCreated({ id: sensor.id, name: sensor.name, device: sensor.device });
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={Cpu}
        title="Sensores"
        subtitle="Las lecturas las mandan los controladores físicos; aquí solo administras qué sensores existen."
        actions={
          <>
            <ConnectionBadge status={status} />
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Agregar sensor
            </Button>
          </>
        }
      />

      <ActiveAlertsBanner greenhouseId={greenhouseId} />

      {isLoading ? (
        <Spinner />
      ) : !sensors?.length ? (
        <EmptyState title="Todavía no hay sensores" hint="Agrega uno eligiendo un tipo predesignado o del catálogo." />
      ) : (
        <div className="space-y-4">
          {sensors.map((s) => {
            const code = typeCodeById.get(s.sensor_type) ?? "";
            const preset = findSensorPreset(code, s.sensor_type_name);
            const type = typeById.get(s.sensor_type);
            const live = liveBySensor.get(s.id);
            const points = series[s.id] ?? [];
            return (
              <Card
                key={s.id}
                className="relative overflow-hidden border-brand-100/80 bg-surface"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <div className="order-first flex justify-end gap-1 sm:order-last sm:flex-col sm:self-start">
                    <Link
                      to={`/greenhouses/${greenhouseId}/alerts?sensor=${s.id}`}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-brand-50 hover:text-brand-700 sm:p-1"
                      title="Crear regla de alerta"
                    >
                      <BellPlus className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-brand-50 hover:text-brand-700 sm:p-1"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(s.id)}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 sm:p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Link
                    to={`/greenhouses/${greenhouseId}/sensors/${s.id}`}
                    className="flex flex-1 items-center gap-4"
                  >
                    <SensorGauge
                      code={code}
                      typeName={s.sensor_type_name}
                      value={live?.value}
                      min={type?.valid_min ?? null}
                      max={type?.valid_max ?? null}
                      size={60}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-neutral-900">
                        <span className="break-words">{s.name}</span>
                        {alertingSensors.has(s.id) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            <ShieldAlert className="h-3 w-3" /> Alerta
                          </span>
                        )}
                        <span className="inline-flex max-w-full items-center rounded-md bg-brand-50 pl-1.5 font-mono text-[11px] font-medium text-brand-700">
                          ID {s.id}
                          <CopyButton text={String(s.id)} className="!px-1 !py-0.5" />
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500">{s.sensor_type_name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {s.is_active ? "🌱 Activo" : "Inactivo"}
                        {live?.timestamp && ` · última lectura ${new Date(live.timestamp).toLocaleTimeString()}`}
                      </p>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-baseline gap-1.5 sm:w-28 sm:justify-end lg:w-32">
                    <span className="text-2xl font-semibold text-neutral-900">
                      {live?.value ?? "—"}
                    </span>
                    <span className="text-sm text-neutral-500">{live?.unit ?? s.effective_unit}</span>
                  </div>

                  <div className="w-full sm:w-40 lg:w-56">
                    <LiveSparkline points={points} color={preset?.hex} unit={live?.unit ?? s.effective_unit} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title="Agregar sensor" icon={Cpu}>
        {!preset && !custom ? (
          <div>
            <p className="mb-3 text-sm text-neutral-500">Elige un tipo predesignado para empezar:</p>
            <div className="grid grid-cols-2 gap-2">
              {SENSOR_PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.code}
                    onClick={() => choosePreset(p)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                    style={{ background: `linear-gradient(180deg, ${p.hex}14, transparent)` }}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      style={{ background: `${p.hex}22` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: p.hex }} />
                    </span>
                    <span className="text-xs font-medium text-neutral-700">{p.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setCustom(true)}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 p-3 text-sm font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" /> Otro tipo (elegir del catálogo)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {(() => {
              const chosen = sensorTypes?.find((t) => t.id === sensorTypeId);
              const shown = preset ?? (chosen ? findSensorPreset(chosen.code, chosen.name) : undefined);
              const hex = shown?.hex ?? "#64748b";
              const Icon = shown?.icon ?? Cpu;
              return (
                <div
                  className="mb-4 flex items-center gap-3 rounded-xl p-3"
                  style={{ background: `linear-gradient(90deg, ${hex}18, transparent)` }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: `${hex}22` }}>
                    <Icon className="h-6 w-6" style={{ color: hex }} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{preset?.name ?? chosen?.name ?? "Otro tipo"}</p>
                    <p className="text-xs text-neutral-500">
                      {preset?.description ?? (chosen ? chosen.description || `Unidad: ${chosen.default_unit}` : "Elige cualquiera de los tipos del catálogo.")}
                    </p>
                  </div>
                </div>
              );
            })()}
            {custom && (
              <NewTypeInline
                kind="sensor"
                greenhouseId={greenhouseId}
                canCreate={canManage}
                onCreated={(t) => {
                  setSensorTypeId(t.id);
                  setName((n) => n || t.name);
                }}
              />
            )}
            {!custom && !sensorTypeId && !me?.is_staff && !canManage && (
              <p className="mb-4 text-sm text-amber-600">
                Este tipo todavía no existe en el catálogo. Pide a un administrador que lo cree, o elige otro tipo ya
                disponible abajo.
              </p>
            )}
            <div className="mb-4">
              <Label>Tipo de sensor (catálogo real)</Label>
              <Select
                value={sensorTypeId}
                onChange={(e) => setSensorTypeId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Selecciona...</option>
                {sensorTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <Label>Nombre del sensor</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </div>
            <div className="mb-4">
              <Label>Dispositivo (opcional)</Label>
              <Select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Sin asignar</option>
                {devices?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <Label>Zona (opcional)</Label>
              <Select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Sin zona</option>
                {zones?.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </div>
            <ErrorText>{createSensor.isError ? formatApiError(createSensor.error) : null}</ErrorText>
            <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
              <Button type="button" variant="secondary" onClick={() => { setPreset(null); setCustom(false); setSensorTypeId(""); }}>
                Atrás
              </Button>
              <Button type="submit" loading={createSensor.isPending} disabled={!sensorTypeId}>
                Crear sensor
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={created != null} onClose={() => setCreated(null)} title="Sensor creado" icon={Cpu}>
        {created && (
          <div>
            <p className="mb-3 text-sm text-neutral-600">
              <b>{created.name}</b> ya existe. Este es el número que tu Arduino/ESP32 debe mandar como{" "}
              <code>sensor_id</code> al ingestar lecturas:
            </p>
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
              <p className="font-mono text-4xl font-bold text-brand-900">{created.id}</p>
              <CopyButton text={String(created.id)} label="Copiar ID" className="border border-brand-200 bg-surface" />
            </div>
            {!created.device && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No le asignaste dispositivo: el backend rechazará sus lecturas hasta que lo hagas (puedes hacerlo en la
                página del sensor).
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
              <Button variant="secondary" onClick={() => setCreated(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  const target = created.id;
                  setCreated(null);
                  navigate(`/greenhouses/${greenhouseId}/sensors/${target}`);
                }}
              >
                Ver cómo conectarlo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <PurgeSensorModal sensor={purging} greenhouseId={greenhouseId} onClose={() => setPurging(null)} />
      <EditSensorModal sensor={editing} greenhouseId={greenhouseId} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={toDelete != null}
        title="Eliminar sensor"
        message="Se eliminará el sensor y dejará de recibir lecturas. Si ya tiene lecturas guardadas, el historial lo protege y no se podrá eliminar (puedes desactivarlo). Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteSensor.isPending}
        error={deleteSensor.isError ? formatApiError(deleteSensor.error) : null}
        extra={
          deleteSensor.isError && toDelete != null ? (
            <>
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                const s = sensors?.find((x) => x.id === toDelete);
                if (s) setPurging({ id: s.id, name: s.name });
                deleteSensor.reset();
                setToDelete(null);
              }}
            >
              Eliminar con historial…
            </Button>
            <Button
              variant="ghost"
              loading={updateSensor.isPending}
              onClick={() =>
                updateSensor.mutate(
                  { id: toDelete, is_active: false },
                  {
                    onSuccess: () => {
                      deleteSensor.reset();
                      setToDelete(null);
                    },
                  }
                )
              }
            >
              Desactivar en su lugar
            </Button>
            </>
          ) : null
        }
        onConfirm={() => {
          if (toDelete != null) deleteSensor.mutate(toDelete, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => {
          deleteSensor.reset();
          setToDelete(null);
        }}
      />
    </Layout>
  );
}
