import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu, MapPin, Pencil, ToggleLeft, Trash2 } from "lucide-react";
import { useActuators, useActuatorTypeCodeMap, useSensors, useSensorTypeCodeMap } from "../hooks/useGreenhouses";
import { useRealtime } from "../hooks/useRealtime";
import { findSensorPreset } from "../lib/sensorPresets";
import { spring, useCalm } from "../lib/motion";
import { ActuatorGauge } from "./ActuatorGauge";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Zone } from "../types";

/**
 * Plano del invernadero visto desde arriba: cada zona es una cama de
 * cultivo dentro del contorno de vidrio, con puntos de color por cada
 * sensor asignado y un foco por cada actuador encendido. Al tocar una
 * zona se abre su detalle con los valores en vivo.
 *
 * Las ediciones (renombrar, borrar) siguen usando los mismos modales de
 * ZonesPage; aquí solo se muestran los datos que ya existen.
 */
export function ZonePlan({
  greenhouseId,
  zones,
  onEdit,
  onDelete,
}: {
  greenhouseId: number;
  zones: Zone[];
  onEdit: (z: Zone) => void;
  onDelete: (zoneId: number) => void;
}) {
  const calm = useCalm();
  const { data: sensors } = useSensors(greenhouseId);
  const { data: actuators } = useActuators(greenhouseId);
  const typeCode = useSensorTypeCodeMap();
  const actTypeCode = useActuatorTypeCodeMap();
  const { snapshot } = useRealtime(greenhouseId);
  const [picked, setPicked] = useState<number | "none" | null>(null);

  const live = useMemo(() => new Map(snapshot?.sensors.map((s) => [s.sensor_id, s])), [snapshot]);
  const liveAct = useMemo(() => new Map(snapshot?.actuators.map((a) => [a.actuator_id, a.state])), [snapshot]);

  const beds: Array<{ key: number | "none"; zone: Zone | null; name: string; description: string }> = [
    ...zones.map((z) => ({ key: z.id, zone: z, name: z.name, description: z.description })),
  ];
  const unassignedCount =
    (sensors ?? []).filter((s) => s.zone == null).length + (actuators ?? []).filter((a) => a.zone == null).length;
  if (unassignedCount > 0) beds.push({ key: "none", zone: null, name: "Sin zona", description: "Sensores y actuadores sin asignar" });

  const inBed = (key: number | "none") => ({
    s: (sensors ?? []).filter((x) => (key === "none" ? x.zone == null : x.zone === key)),
    a: (actuators ?? []).filter((x) => (key === "none" ? x.zone == null : x.zone === key)),
  });
  // Por defecto se muestra la primera zona que tenga algo asignado.
  const selected =
    picked ?? beds.find((b) => inBed(b.key).s.length + inBed(b.key).a.length > 0)?.key ?? beds[0]?.key ?? null;
  const current = beds.find((b) => b.key === selected) ?? null;
  const currentItems = current ? inBed(current.key) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      {/* Plano */}
      <div className="relative overflow-hidden rounded-[1.75rem] border-[3px] border-neutral-300/80 bg-brand-50/50 p-4 shadow-pane sm:p-6">
        <div aria-hidden className="greenhouse-grid pointer-events-none absolute inset-0 opacity-80" />
        <div className="relative mb-4 flex items-center justify-between text-xs text-neutral-500">
          <span>Vista desde arriba</span>
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden /> sensor
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-200" aria-hidden /> actuador encendido
            </span>
          </span>
        </div>
        <ul className="relative grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" role="listbox" aria-label="Zonas">
          {beds.map((b, i) => {
            const items = inBed(b.key);
            const active = selected === b.key;
            const onCount = items.a.filter((a) => liveAct.get(a.id) ?? a.state).length;
            return (
              <motion.li
                key={String(b.key)}
                initial={calm ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, ...spring }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setPicked(b.key)}
                  className={`relative block min-h-[132px] w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition duration-200 ease-leaf ${
                    active
                      ? "border-brand-500 bg-surface shadow-lift"
                      : b.key === "none"
                        ? "border-dashed border-neutral-300 bg-surface/60 hover:border-neutral-400"
                        : "border-[#B88A5E]/50 bg-[#E9D9C2]/60 hover:-translate-y-0.5 hover:border-brand-300 dark:bg-[#3A2E22]/60"
                  }`}
                >
                  {/* Surcos de la cama */}
                  {b.key !== "none" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: "repeating-linear-gradient(90deg, transparent 0 18px, rgb(122 90 60 / 0.25) 18px 20px)",
                      }}
                    />
                  )}
                  <span className="relative flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg font-semibold text-neutral-900">{b.name}</span>
                      {b.description && <span className="block truncate text-xs text-neutral-600">{b.description}</span>}
                    </span>
                    {onCount > 0 && (
                      <span className="num shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {onCount} encendido{onCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <span className="relative mt-4 flex flex-wrap gap-1.5" aria-hidden>
                    {items.s.map((s) => {
                      const preset = findSensorPreset(typeCode.get(s.sensor_type) ?? "", s.sensor_type_name);
                      return (
                        <span
                          key={s.id}
                          className="h-3 w-3 rounded-full ring-2 ring-white/80 dark:ring-black/30"
                          style={{ background: preset?.hex ?? "#2F7E48" }}
                        />
                      );
                    })}
                    {items.a.map((a) => (
                      <span
                        key={`a${a.id}`}
                        className={`h-3 w-3 rounded-sm ${liveAct.get(a.id) ?? a.state ? "bg-amber-400 ring-2 ring-amber-200" : "bg-neutral-300"}`}
                      />
                    ))}
                  </span>
                  <span className="relative mt-2 block text-xs text-neutral-600">
                    {items.s.length} sensor{items.s.length === 1 ? "" : "es"}, {items.a.length} actuador{items.a.length === 1 ? "" : "es"}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Detalle de la zona elegida */}
      <AnimatePresence mode="wait">
        {current && currentItems && (
          <motion.aside
            key={String(current.key)}
            initial={calm ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.25 }}
            className="rounded-[1.25rem] border border-neutral-200/80 bg-surface p-5 shadow-pane"
            aria-live="polite"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                  <MapPin className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                  <span className="truncate">{current.name}</span>
                </h2>
                {current.description && <p className="mt-0.5 text-sm text-neutral-600">{current.description}</p>}
              </div>
              {current.zone && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onEdit(current.zone!)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-brand-50 hover:text-brand-700"
                    aria-label={`Editar ${current.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(current.zone!.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Eliminar ${current.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              <Cpu className="h-4 w-4" aria-hidden /> Sensores
            </h3>
            {currentItems.s.length ? (
              <ul className="mb-4 divide-y divide-neutral-200/70">
                {currentItems.s.map((s) => {
                  const l = live.get(s.id);
                  const preset = findSensorPreset(typeCode.get(s.sensor_type) ?? "", s.sensor_type_name);
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/greenhouses/${greenhouseId}/sensors/${s.id}`}
                        className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100/80"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: preset?.hex ?? "#2F7E48" }} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-neutral-800">{s.name}</span>
                        <span className="font-semibold text-neutral-900">
                          <AnimatedNumber value={l?.value} />
                          <span className="ml-1 text-xs font-normal text-neutral-500">{l?.unit ?? s.effective_unit}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-neutral-500">Ningún sensor en esta zona.</p>
            )}

            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
              <ToggleLeft className="h-4 w-4" aria-hidden /> Actuadores
            </h3>
            {currentItems.a.length ? (
              <ul className="divide-y divide-neutral-200/70">
                {currentItems.a.map((a) => {
                  const on = liveAct.get(a.id) ?? a.state;
                  return (
                    <li key={a.id}>
                      <Link
                        to={`/greenhouses/${greenhouseId}/actuators/${a.id}`}
                        className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100/80"
                      >
                        <ActuatorGauge code={actTypeCode.get(a.actuator_type) ?? ""} typeName={a.actuator_type_name} on={on} size={32} />
                        <span className="min-w-0 flex-1 truncate text-neutral-800">{a.name}</span>
                        <span className={`text-xs font-semibold ${on ? "text-emerald-700" : "text-neutral-500"}`}>
                          {on ? "Encendido" : "Apagado"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Ningún actuador en esta zona.</p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
