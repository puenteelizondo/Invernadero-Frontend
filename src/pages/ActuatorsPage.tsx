import { useMemo, useState } from "react";
import type { Actuator } from "../types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, ToggleLeft, Trash2 } from "lucide-react";
import {
  useActuatorTypesFor,
  useCanManageGreenhouse,
  useActuatorTypeCodeMap,
  useCreateActuator,
  useCreateActuatorType,
  useActuators,
  useDeleteActuator,
  useUpdateActuator,
  useDevices,
  useSetActuatorState,
  useZones,
} from "../hooks/useGreenhouses";
import { useMe } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { ACTUATOR_PRESETS, findActuatorPreset, type ActuatorPreset } from "../lib/actuatorPresets";
import { formatApiError } from "../lib/api";
import { Layout } from "../components/Layout";
import { ActuatorGauge } from "../components/ActuatorGauge";
import { EditActuatorModal } from "../components/EditActuatorModal";
import { NewTypeInline } from "../components/NewTypeInline";
import { PurgeSensorModal as PurgeModal } from "../components/PurgeSensorModal";
import { CopyButton } from "../components/CopyButton";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";

export function ActuatorsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const greenhouseId = Number(id);
  const { data: me } = useMe();
  const { data: actuators, isLoading } = useActuators(greenhouseId);
  const { data: actuatorTypes } = useActuatorTypesFor(greenhouseId);
  const canManage = useCanManageGreenhouse(greenhouseId);
  const actuatorTypeCodeById = useActuatorTypeCodeMap();
  const { data: devices } = useDevices(greenhouseId);
  const { data: zones } = useZones(greenhouseId);
  const { status, snapshot } = useRealtime(greenhouseId);
  const createActuator = useCreateActuator(greenhouseId);
  const createActuatorType = useCreateActuatorType();
  const deleteActuator = useDeleteActuator(greenhouseId);
  const updateActuator = useUpdateActuator(greenhouseId);
  const setState = useSetActuatorState(greenhouseId);

  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<ActuatorPreset | null>(null);
  // "Otro tipo": sin preset, eligiendo cualquier tipo del catálogo.
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [actuatorTypeId, setActuatorTypeId] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [editing, setEditing] = useState<Actuator | null>(null);
  const [purging, setPurging] = useState<{ id: number; name: string } | null>(null);
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null);

  const existingByCode = useMemo(() => new Map(actuatorTypes?.map((t) => [t.code, t])), [actuatorTypes]);
  const liveByActuator = new Map(snapshot?.actuators.map((a) => [a.actuator_id, a]));

  function resetForm() {
    setPreset(null);
    setCustom(false);
    setName("");
    setActuatorTypeId("");
    setDeviceId("");
    setZoneId("");
  }

  async function choosePreset(p: ActuatorPreset) {
    setPreset(p);
    const existing = existingByCode.get(p.code);
    if (existing) {
      setActuatorTypeId(existing.id);
      setName((n) => n || existing.name);
      return;
    }
    if (me?.is_staff || canManage) {
      // El staff lo crea GLOBAL; el dueño de un invernadero lo crea PROPIO de ese invernadero.
      const created = await createActuatorType.mutateAsync({
        code: p.code,
        name: p.name,
        description: p.description,
        greenhouse: me?.is_staff ? null : greenhouseId,
      });
      setActuatorTypeId(created.id);
      setName((n) => n || created.name);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actuatorTypeId) return;
    createActuator.mutate(
      { name, actuator_type: actuatorTypeId, device: deviceId || null, zone: zoneId || null },
      {
        onSuccess: (actuator) => {
          setOpen(false);
          resetForm();
          setCreated({ id: actuator.id, name: actuator.name });
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={ToggleLeft}
        title="Actuadores"
        subtitle="Enciende, apaga y revisa el historial de cada actuador."
        actions={
          <>
            <ConnectionBadge status={status} />
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Agregar actuador
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !actuators?.length ? (
        <EmptyState title="Todavía no hay actuadores" hint="Agrega uno eligiendo un tipo predesignado." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actuators.map((a) => {
            const live = liveByActuator.get(a.id);
            const on = live ? live.state : a.state;
            return (
              <Card
                key={a.id}
                className={`relative overflow-hidden transition duration-300 ${
                  on ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50" : "bg-gradient-to-br from-white to-neutral-50"
                }`}
              >
                <button
                  onClick={() => setEditing(a)}
                  className="absolute right-10 top-3 z-10 rounded-lg p-1 text-neutral-400 hover:bg-brand-50 hover:text-brand-700"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(a.id)}
                  className="absolute right-3 top-3 rounded-lg p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link
                  to={`/greenhouses/${greenhouseId}/actuators/${a.id}`}
                  className="mb-3 flex items-center gap-3 pr-8"
                >
                  <ActuatorGauge
                    code={actuatorTypeCodeById.get(a.actuator_type) ?? ""}
                    typeName={a.actuator_type_name}
                    on={on}
                    size={64}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{a.name}</p>
                    <p className="text-xs text-neutral-500">{a.actuator_type_name}</p>
                    <span className="mt-1 inline-flex items-center rounded-md bg-brand-50 pl-1.5 font-mono text-[11px] font-medium text-brand-700">
                      ID {a.id}
                      <CopyButton text={String(a.id)} className="!px-1 !py-0.5" />
                    </span>
                  </div>
                </Link>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      on ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {on ? "Encendido" : "Apagado"}
                  </span>
                  <button
                    onClick={() => setState.mutate({ id: a.id, state: !on })}
                    disabled={setState.isPending}
                    className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand-600" : "bg-neutral-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        on ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title="Agregar actuador" icon={ToggleLeft}>
        {!preset && !custom ? (
          <div>
            <p className="mb-3 text-sm text-neutral-500">Elige un tipo predesignado para empezar:</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTUATOR_PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.code}
                    onClick={() => choosePreset(p)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-200 p-3 text-center hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Icon className={`h-6 w-6 ${p.color}`} />
                    <span className="text-xs font-medium text-neutral-700">{p.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setCustom(true)}
                className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 p-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" /> Otro tipo (elegir del catálogo)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {(() => {
              const chosen = actuatorTypes?.find((t) => t.id === actuatorTypeId);
              const shown = preset ?? (chosen ? findActuatorPreset(chosen.code, chosen.name) : undefined);
              const Icon = shown?.icon ?? ToggleLeft;
              return (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-neutral-50 p-3">
                  <Icon className={`h-6 w-6 ${shown?.color ?? "text-neutral-500"}`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{preset?.name ?? chosen?.name ?? "Otro tipo"}</p>
                    <p className="text-xs text-neutral-500">
                      {preset?.description ?? (chosen ? chosen.description : "Elige cualquiera de los tipos del catálogo.")}
                    </p>
                  </div>
                </div>
              );
            })()}
            {custom && (
              <NewTypeInline
                kind="actuator"
                greenhouseId={greenhouseId}
                canCreate={canManage}
                onCreated={(t) => {
                  setActuatorTypeId(t.id);
                  setName((n) => n || t.name);
                }}
              />
            )}
            {!custom && !actuatorTypeId && !me?.is_staff && !canManage && (
              <p className="mb-4 text-sm text-amber-600">
                Este tipo todavía no existe en el catálogo. Pide a un administrador que lo cree, o elige otro tipo ya
                disponible abajo.
              </p>
            )}
            <div className="mb-4">
              <Label>Tipo de actuador (catálogo real)</Label>
              <Select
                value={actuatorTypeId}
                onChange={(e) => setActuatorTypeId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Selecciona...</option>
                {actuatorTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <Label>Nombre del actuador</Label>
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
            <ErrorText>{createActuator.isError ? formatApiError(createActuator.error) : null}</ErrorText>
            <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
              <Button type="button" variant="secondary" onClick={() => { setPreset(null); setCustom(false); setActuatorTypeId(""); }}>
                Atrás
              </Button>
              <Button type="submit" loading={createActuator.isPending} disabled={!actuatorTypeId}>
                Crear actuador
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={created != null} onClose={() => setCreated(null)} title="Actuador creado" icon={ToggleLeft}>
        {created && (
          <div>
            <p className="mb-3 text-sm text-neutral-600">
              <b>{created.name}</b> ya existe. Este es su <code>actuator_id</code>:
            </p>
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
              <p className="font-mono text-4xl font-bold text-brand-900">{created.id}</p>
              <CopyButton text={String(created.id)} label="Copiar ID" className="border border-brand-200 bg-white" />
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
              <Button variant="secondary" onClick={() => setCreated(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  const target = created.id;
                  setCreated(null);
                  navigate(`/greenhouses/${greenhouseId}/actuators/${target}`);
                }}
              >
                Ver cómo conectarlo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <PurgeModal kind="actuator" sensor={purging} greenhouseId={greenhouseId} onClose={() => setPurging(null)} />
      <EditActuatorModal actuator={editing} greenhouseId={greenhouseId} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={toDelete != null}
        title="Eliminar actuador"
        message="Se eliminará el actuador. Si ya tiene historial de cambios de estado, no se podrá eliminar de forma normal (puedes desactivarlo o borrarlo con su historial). Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteActuator.isPending}
        error={deleteActuator.isError ? formatApiError(deleteActuator.error) : null}
        extra={
          deleteActuator.isError && toDelete != null ? (
            <>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  const a = actuators?.find((x) => x.id === toDelete);
                  if (a) setPurging({ id: a.id, name: a.name });
                  deleteActuator.reset();
                  setToDelete(null);
                }}
              >
                Eliminar con historial…
              </Button>
              <Button
                variant="ghost"
                loading={updateActuator.isPending}
                onClick={() =>
                  updateActuator.mutate(
                    { id: toDelete, is_active: false },
                    {
                      onSuccess: () => {
                        deleteActuator.reset();
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
          if (toDelete != null) deleteActuator.mutate(toDelete, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => {
          deleteActuator.reset();
          setToDelete(null);
        }}
      />
    </Layout>
  );
}
