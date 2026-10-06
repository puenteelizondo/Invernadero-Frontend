import { useMemo, useState } from "react";
import { ActiveAlertsBanner } from "../components/ActiveAlertsBanner";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowUpRight, Clock, Cpu, MapPin, Power, Settings, Sheet, ToggleLeft, Users } from "lucide-react";
import {
  useGreenhouse,
  useSensors,
  useActuators,
  useSensorTypeCodeMap,
  useSensorTypes,
  useActuatorTypeCodeMap,
  useCanManageGreenhouse,
} from "../hooks/useGreenhouses";
import { useRealtime } from "../hooks/useRealtime";
import { Layout } from "../components/Layout";
import { Button, Card, EmptyState, Skeleton } from "../components/ui";
import { EditGreenhouseModal } from "../components/EditGreenhouseModal";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { SensorGauge } from "../components/SensorGauge";
import { ActuatorGauge } from "../components/ActuatorGauge";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { LiveSparkline } from "../components/LiveSparkline";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { GreenhouseScene, formatHour, phaseLabel, useLocalHour } from "../components/GreenhouseScene";
import { findSensorPreset } from "../lib/sensorPresets";
import { findActuatorPreset } from "../lib/actuatorPresets";

// Orden en que se eligen los sensores que "cuelgan" en la escena.
const SCENE_PRIORITY = ["temperature", "humidity", "light", "co2", "soil_moisture"];
const IRRIGATION = new Set(["water_pump", "valve"]);

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando panel">
      <Skeleton className="mb-3 h-9 w-64" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <Skeleton className="mb-6 h-[300px] rounded-[1.75rem]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  );
}

export function GreenhouseDashboardPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: greenhouse, isLoading } = useGreenhouse(greenhouseId);
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canManage = useCanManageGreenhouse(greenhouseId);
  const { data: sensors } = useSensors(greenhouseId);
  const { data: actuators } = useActuators(greenhouseId);
  const typeCodeById = useSensorTypeCodeMap();
  const { data: sensorTypes } = useSensorTypes();
  const typeById = useMemo(() => new Map(sensorTypes?.map((t) => [t.id, t])), [sensorTypes]);
  const actuatorTypeCodeById = useActuatorTypeCodeMap();
  const { status, snapshot, series, events } = useRealtime(greenhouseId);
  const hour = useLocalHour(greenhouse?.timezone);

  if (isLoading || !greenhouse) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  const liveBySensor = new Map(snapshot?.sensors.map((s) => [s.sensor_id, s]));
  const liveByActuator = new Map(snapshot?.actuators.map((a) => [a.actuator_id, a]));
  const liveSensors = snapshot?.sensors.filter((s) => s.value != null).length ?? 0;
  const actuatorState = (a: { id: number; state: boolean }) => liveByActuator.get(a.id)?.state ?? a.state;
  const actuatorsOn = (actuators ?? []).filter((a) => actuatorState(a) === true).length;

  // Lo que la escena refleja sale de datos reales: sensores y actuadores de este invernadero.
  const sensorCode = (s: { sensor_type: number; sensor_type_name: string }) =>
    findSensorPreset(typeCodeById.get(s.sensor_type) ?? "", s.sensor_type_name)?.code ?? "";
  const actuatorCode = (a: { actuator_type: number; actuator_type_name: string }) =>
    findActuatorPreset(actuatorTypeCodeById.get(a.actuator_type) ?? "", a.actuator_type_name)?.code ?? "";
  const humiditySensor = sensors?.find((s) => sensorCode(s) === "humidity");
  const humidity = humiditySensor ? liveBySensor.get(humiditySensor.id)?.value ?? null : null;
  const anyOn = (pred: (code: string) => boolean) =>
    (actuators ?? []).some((a) => pred(actuatorCode(a)) && actuatorState(a));
  const sceneSensors = [...(sensors ?? [])]
    .sort((a, b) => {
      const ia = SCENE_PRIORITY.indexOf(sensorCode(a));
      const ib = SCENE_PRIORITY.indexOf(sensorCode(b));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .slice(0, 4);

  const tiles = [
    { icon: Cpu, label: "Sensores", value: sensors?.length ?? 0, sub: `${liveSensors} con dato en vivo`, to: `/greenhouses/${greenhouseId}/sensors` },
    { icon: Power, label: "Actuadores", value: actuators?.length ?? 0, sub: `${actuatorsOn} encendidos`, to: `/greenhouses/${greenhouseId}/actuators` },
    { icon: MapPin, label: "Zonas", value: greenhouse.zones?.length ?? 0, sub: "en este invernadero", to: `/greenhouses/${greenhouseId}/zones` },
    { icon: Activity, label: "Eventos en vivo", value: events.length, sub: `${events.filter((e) => e.persisted).length} guardados`, to: "#actividad" },
  ];
  const tileClass =
    "group relative flex flex-col rounded-[1.25rem] border border-neutral-200/80 bg-surface p-4 text-left shadow-pane transition duration-200 ease-leaf hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20";

  return (
    <Layout>
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-semibold leading-[1.1] text-neutral-900 sm:text-[2.6rem]">{greenhouse.name}</h1>
          {greenhouse.description && <p className="mt-1.5 max-w-xl text-[0.95rem] text-neutral-600">{greenhouse.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionBadge status={status} />
          <Link to={`/greenhouses/${greenhouseId}/export`}>
            <Button variant="secondary">
              <Sheet className="h-4 w-4" /> Exportar a Excel
            </Button>
          </Link>
          {canManage && (
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" /> Configurar
            </Button>
          )}
        </div>
      </div>

      <EditGreenhouseModal
        greenhouse={greenhouse}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDeleted={() => navigate("/greenhouses", { replace: true })}
      />

      {/* Escena viva del invernadero */}
      <GreenhouseScene
        hour={hour}
        humidity={humidity}
        growLight={anyOn((c) => c === "light")}
        fanOn={anyOn((c) => c === "fan")}
        irrigating={anyOn((c) => IRRIGATION.has(c))}
        heaterOn={anyOn((c) => c === "heater")}
        coolerOn={anyOn((c) => c === "cooler")}
        curtainOn={anyOn((c) => c === "curtain")}
        misting={anyOn((c) => c === "mister")}
        actuators={(actuators ?? []).map((a) => actuatorState(a))}
        className="mb-5 h-[300px] rounded-[1.75rem] border border-neutral-200/80 shadow-pane lg:h-[340px]"
      >
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-surface/85 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur-md sm:left-4 sm:top-4">
          <Clock className="h-3.5 w-3.5 text-brand-600" aria-hidden />
          <span className="num font-semibold text-neutral-900">{formatHour(hour)}</span>
          <span>{phaseLabel(hour)}, hora del invernadero</span>
        </div>
        {sceneSensors.length > 0 && (
          <ul className="absolute inset-x-0 bottom-0 flex snap-x gap-2 overflow-x-auto p-3 sm:p-4 [scrollbar-width:none]">
            {sceneSensors.map((s, i) => {
              const live = liveBySensor.get(s.id);
              const type = typeById.get(s.sensor_type);
              return (
                <motion.li
                  key={s.id}
                  className="snap-start"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={`/greenhouses/${greenhouseId}/sensors/${s.id}`}
                    className="flex min-w-[10.5rem] items-center gap-2.5 rounded-2xl border border-white/40 bg-surface/85 py-2 pl-2 pr-3.5 shadow-lift backdrop-blur-md transition hover:bg-surface dark:border-white/10"
                  >
                    <SensorGauge
                      code={typeCodeById.get(s.sensor_type) ?? ""}
                      typeName={s.sensor_type_name}
                      value={live?.value}
                      min={type?.valid_min ?? null}
                      max={type?.valid_max ?? null}
                      size={38}
                    />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-xs text-neutral-600">{s.name}</span>
                      <span className="text-lg font-semibold text-neutral-900">
                        <AnimatedNumber value={live?.value} />
                        <span className="ml-1 text-xs font-medium text-neutral-500">{live?.unit ?? s.effective_unit}</span>
                      </span>
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </GreenhouseScene>

      <ActiveAlertsBanner greenhouseId={greenhouseId} />

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="mb-3 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <t.icon className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600" aria-hidden />
              </span>
              <span className="font-display text-3xl font-semibold leading-none text-neutral-900">
                <AnimatedNumber value={t.value} />
              </span>
              <span className="mt-1.5 text-sm font-medium text-neutral-800">{t.label}</span>
              <span className="text-xs text-neutral-500">{t.sub}</span>
            </>
          );
          return t.to.startsWith("#") ? (
            <button
              key={t.label}
              type="button"
              className={tileClass}
              onClick={() => document.getElementById(t.to.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {body}
            </button>
          ) : (
            <Link key={t.label} to={t.to} className={tileClass}>
              {body}
            </Link>
          );
        })}
      </div>

      {/* Lecturas en vivo */}
      <section aria-labelledby="h-sensores" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="h-sensores" className="text-xl font-semibold text-neutral-900">
            Lecturas en vivo
          </h2>
          <Link to={`/greenhouses/${greenhouseId}/sensors`} className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos los sensores
          </Link>
        </div>
        {!sensors?.length ? (
          <EmptyState title="Todavía no hay sensores" hint="Agrega uno en Sensores y asígnalo a un dispositivo para empezar a ver lecturas aquí." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sensors.slice(0, 9).map((s) => {
              const live = liveBySensor.get(s.id);
              const type = typeById.get(s.sensor_type);
              const preset = findSensorPreset(typeCodeById.get(s.sensor_type) ?? "", s.sensor_type_name);
              return (
                <Link
                  key={s.id}
                  to={`/greenhouses/${greenhouseId}/sensors/${s.id}`}
                  className="group rounded-[1.25rem] border border-neutral-200/80 bg-surface p-4 shadow-pane transition duration-200 ease-leaf hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
                >
                  <div className="flex items-center gap-3">
                    <SensorGauge
                      code={typeCodeById.get(s.sensor_type) ?? ""}
                      typeName={s.sensor_type_name}
                      value={live?.value}
                      min={type?.valid_min ?? null}
                      max={type?.valid_max ?? null}
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">{s.name}</p>
                      <p className="truncate text-xs text-neutral-500">{s.sensor_type_name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="shrink-0 leading-none">
                      <span className="font-display text-[2rem] font-semibold text-neutral-900">
                        <AnimatedNumber value={live?.value} />
                      </span>
                      <span className="ml-1 text-sm font-medium text-neutral-500">{live?.unit ?? s.effective_unit}</span>
                    </p>
                    <div className="min-w-0 flex-1">
                      <LiveSparkline points={series[s.id] ?? []} color={preset?.hex} unit={live?.unit ?? s.effective_unit} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Actuadores */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <ToggleLeft className="h-[1.1rem] w-[1.1rem] text-brand-600" aria-hidden /> Actuadores
            </h2>
            <Link to={`/greenhouses/${greenhouseId}/actuators`} className="text-sm font-medium text-brand-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {!actuators?.length ? (
            <p className="text-sm text-neutral-500">Todavía no hay actuadores.</p>
          ) : (
            <ul className="space-y-1">
              {actuators.slice(0, 6).map((a) => {
                const on = actuatorState(a);
                return (
                  <li key={a.id}>
                    <Link
                      to={`/greenhouses/${greenhouseId}/actuators/${a.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-100/80"
                    >
                      <ActuatorGauge
                        code={actuatorTypeCodeById.get(a.actuator_type) ?? ""}
                        typeName={a.actuator_type_name}
                        on={on}
                        size={40}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{a.name}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300 ${
                          on ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-neutral-400"}`} aria-hidden />
                        {on ? "Encendido" : "Apagado"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Actividad */}
        <div id="actividad" className="scroll-mt-20 lg:col-span-3">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <Activity className="h-[1.1rem] w-[1.1rem] text-brand-600" aria-hidden /> Actividad en vivo
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              Lo último que mandaron los sensores. "Guardada" = quedó en la base de datos; "Solo caché" = solo se vio en vivo.
            </p>
            <LiveActivityFeed events={events} limit={8} />
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="mb-1.5 flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <Users className="h-[1.1rem] w-[1.1rem] text-brand-600" aria-hidden /> Accesos
        </h2>
        <p className="text-sm text-neutral-600">
          Gestiona quién puede ver u operar este invernadero desde{" "}
          <Link to={`/greenhouses/${greenhouseId}/members`} className="font-medium text-brand-700 hover:underline">
            Miembros
          </Link>
          .
        </p>
      </Card>
    </Layout>
  );
}
