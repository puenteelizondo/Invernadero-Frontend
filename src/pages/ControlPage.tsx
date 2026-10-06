import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, Plus, SlidersHorizontal } from "lucide-react";
import { useActuators, useDevices, useGreenhouse, useSensors, useSensorTypes, useSensorTypeCodeMap, useActuatorTypeCodeMap } from "../hooks/useGreenhouses";
import { useCanEditControl, useControlLoops, useDeleteLoop } from "../hooks/useControl";
import { useRealtime } from "../hooks/useRealtime";
import { formatApiError } from "../lib/api";
import { findSensorPreset } from "../lib/sensorPresets";
import type { VarInput, VarKey } from "../lib/plant";
import type { ControlLoop } from "../types";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { ControlFirmwarePanel } from "../components/ControlFirmwarePanel";
import { LoopCard } from "../components/LoopCard";
import { LoopModal } from "../components/LoopModal";
import { PlantScene } from "../components/PlantScene";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, PageHeader, PageSkeleton } from "../components/ui";

// Código del tipo de sensor -> variable de la planta.
const CODE_TO_VAR: Record<string, VarKey> = {
  temperature: "temperature",
  humidity: "humidity",
  light: "light",
  soil_moisture: "soil",
  co2: "co2",
  ph: "ph",
  ec: "ec",
  wind_speed: "wind",
};

const VAR_LABEL: Record<VarKey, string> = {
  temperature: "Temperatura", humidity: "Humedad del aire", light: "Luz", soil: "Humedad del suelo",
  co2: "CO₂", ph: "pH", ec: "Conductividad", wind: "Viento",
};

export function ControlPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: greenhouse, isLoading } = useGreenhouse(greenhouseId);
  const { data: sensors } = useSensors(greenhouseId);
  const { data: actuators } = useActuators(greenhouseId);
  const { data: devices } = useDevices(greenhouseId);
  const { data: sensorTypes } = useSensorTypes();
  const typeCodeById = useSensorTypeCodeMap();
  const actuatorTypeCodeById = useActuatorTypeCodeMap();
  const { data: loops, isLoading: loadingLoops, isError: loopsFailed, error: loopsError, refetch: refetchLoops } = useControlLoops(greenhouseId);
  const canEdit = useCanEditControl(greenhouseId);
  const { status, snapshot, telemetry } = useRealtime(greenhouseId);
  const del = useDeleteLoop(greenhouseId);

  const [modal, setModal] = useState<{ open: boolean; loop: ControlLoop | null }>({ open: false, loop: null });
  const [toDelete, setToDelete] = useState<ControlLoop | null>(null);
  // Qué dispositivo (ESP32) se está viendo; null = todos.
  const [deviceFilter, setDeviceFilter] = useState<number | null>(null);
  useEffect(() => {
    if (deviceFilter != null && devices && !devices.some((d) => d.id === deviceFilter)) setDeviceFilter(null);
  }, [devices, deviceFilter]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const live = useMemo(() => new Map(snapshot?.sensors.map((s) => [s.sensor_id, s])), [snapshot]);
  const typeById = useMemo(() => new Map(sensorTypes?.map((t) => [t.id, t])), [sensorTypes]);

  // Variables de la planta: salen de lecturas REALES (snapshot + eventos en vivo del WebSocket).
  const vars = useMemo(() => {
    const out: Partial<Record<VarKey, VarInput>> = {};
    for (const s of sensors ?? []) {
      if (!s.is_active) continue;
      const preset = findSensorPreset(typeCodeById.get(s.sensor_type) ?? "", s.sensor_type_name);
      const key = preset ? CODE_TO_VAR[preset.code] : undefined;
      if (!key) continue;
      const lv = live.get(s.id);
      const value = lv?.value ?? null;
      // Si hay varios sensores del mismo tipo, manda el que ya tiene lectura.
      if (out[key] && (out[key]!.value != null || value == null)) continue;
      const type = typeById.get(s.sensor_type);
      const loop = (loops ?? []).find((l) => l.sensor === s.id && l.enabled && l.mode !== "off") ?? (loops ?? []).find((l) => l.sensor === s.id);
      out[key] = {
        key,
        label: VAR_LABEL[key],
        unit: lv?.unit ?? s.effective_unit,
        value,
        min: type?.valid_min ?? null,
        max: type?.valid_max ?? null,
        setpoint: loop ? loop.setpoint : null,
        sensorId: s.id,
      };
    }
    return out;
  }, [sensors, live, typeById, typeCodeById, loops]);

  const shownLoops = (loops ?? []).filter((l) => deviceFilter == null || l.device === deviceFilter);

  if (isLoading || !greenhouse) return <PageSkeleton />;

  const sensorsHref = `/greenhouses/${greenhouseId}/sensors`;

  return (
    <>
      <PageHeader
        icon={SlidersHorizontal}
        title="Control"
        subtitle={`Ajusta en vivo los lazos de ${greenhouse.name}. El controlador (ESP32) hace el cálculo; aquí solo cambias sus parámetros.`}
        actions={
          <>
            <ConnectionBadge status={status} />
            {canEdit && (
              <Button onClick={() => setModal({ open: true, loop: null })}>
                <Plus className="h-4 w-4" /> Nuevo lazo
              </Button>
            )}
          </>
        }
      />

      {!canEdit && (
        <p role="note" className="mb-5 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Tienes acceso de solo lectura en este invernadero: puedes ver los lazos y la planta, pero solo un propietario u operador puede cambiar sus parámetros.
        </p>
      )}

      <PlantScene vars={vars} sensorsHref={sensorsHref} />

      <h2 className="mb-3 text-xl font-semibold text-neutral-900">Lazos de control</h2>
      {!!devices?.length && (
        <div role="group" aria-label="Dispositivo" className="mb-4 flex flex-wrap gap-2">
          {[{ id: null as number | null, name: "Todos" }, ...devices.map((d) => ({ id: d.id as number | null, name: d.name }))].map((d) => {
            const n = (loops ?? []).filter((l) => d.id == null || l.device === d.id).length;
            const online = d.id != null && (loops ?? []).some((l) => l.device === d.id && l.device_online);
            const active = deviceFilter === d.id;
            return (
              <button
                key={d.id ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setDeviceFilter(d.id)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-700 text-white dark:bg-brand-500"
                    : "border-neutral-200 bg-surface text-neutral-700 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                {d.id != null && (
                  <span
                    className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-neutral-400"}`}
                    aria-label={online ? "conectado" : "sin conexión"}
                  />
                )}
                {d.name}
                <span className={`num rounded-md px-1.5 text-xs ${active ? "bg-white/20" : "bg-neutral-100 text-neutral-600"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}
      {loadingLoops ? (
        <PageSkeleton />
      ) : loopsFailed ? (
        <Card>
          <ErrorText>No se pudieron cargar los lazos: {formatApiError(loopsError)}</ErrorText>
          <Button variant="secondary" onClick={() => refetchLoops()}>Reintentar</Button>
        </Card>
      ) : !shownLoops.length ? (
        <Card>
          <EmptyState
            title={deviceFilter != null && loops?.length ? `${devices?.find((d) => d.id === deviceFilter)?.name ?? "Este dispositivo"} no tiene lazos` : "Todavía no hay lazos de control"}
            hint={canEdit ? "Crea uno: elige el sensor que se mide y el actuador que se maneja (del mismo dispositivo) y luego el modo P, PI, PID u On/Off." : "Un propietario u operador puede crear el primero."}
          />
        </Card>
      ) : (
        <div className="grid gap-5 2xl:grid-cols-2">
          {shownLoops.map((l) => (
            <LoopCard
              key={l.id}
              loop={l}
              points={telemetry[l.id] ?? []}
              canEdit={canEdit}
              greenhouseId={greenhouseId}
              now={now}
              onEdit={() => setModal({ open: true, loop: l })}
              onDelete={() => setToDelete(l)}
            />
          ))}
        </div>
      )}

      {shownLoops.length > 0 && (
        <ControlFirmwarePanel
          loops={shownLoops}
          sensors={sensors ?? []}
          actuators={actuators ?? []}
          devices={devices ?? []}
          sensorTypes={sensorTypes ?? []}
          typeCodeById={typeCodeById}
          actuatorTypeCodeById={actuatorTypeCodeById}
        />
      )}

      <LoopModal
        open={modal.open}
        loop={modal.loop}
        onClose={() => setModal({ open: false, loop: null })}
        greenhouseId={greenhouseId}
        sensors={sensors ?? []}
        actuators={actuators ?? []}
        devices={devices ?? []}
        loops={loops ?? []}
        sensorTypes={sensorTypes ?? []}
        liveValue={(sid) => live.get(sid)?.value ?? null}
        initialDevice={deviceFilter}
      />

      <ConfirmDialog
        open={toDelete != null}
        title="Eliminar lazo"
        message={`Se borra “${toDelete?.name}” y el controlador dejará de ejecutarlo en cuanto reciba el aviso. El actuador no se apaga solo: revisa su estado después.`}
        confirmLabel="Eliminar"
        danger
        loading={del.isPending}
        error={del.isError ? formatApiError(del.error) : null}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => { del.reset(); setToDelete(null); }}
      />
    </>
  );
}
