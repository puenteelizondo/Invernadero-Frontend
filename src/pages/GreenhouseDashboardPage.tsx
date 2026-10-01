import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Activity, Cpu, MapPin, Power, Settings, Sheet, Sprout, ToggleLeft, Users } from "lucide-react";
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
import { Button, Card, Spinner } from "../components/ui";
import { EditGreenhouseModal } from "../components/EditGreenhouseModal";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { SensorGauge } from "../components/SensorGauge";
import { ActuatorGauge } from "../components/ActuatorGauge";
import { LiveActivityFeed } from "../components/LiveActivityFeed";

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
  const { status, snapshot, events } = useRealtime(greenhouseId);

  if (isLoading || !greenhouse) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  const liveBySensor = new Map(snapshot?.sensors.map((s) => [s.sensor_id, s]));
  const liveByActuator = new Map(snapshot?.actuators.map((a) => [a.actuator_id, a]));
  const liveSensors = snapshot?.sensors.filter((s) => s.value != null).length ?? 0;
  const actuatorsOn = (actuators ?? []).filter((a) => (liveByActuator.get(a.id)?.state ?? a.state) === true).length;

  return (
    <Layout>
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 p-6 text-white shadow-lg shadow-brand-700/20 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%), linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%)",
            backgroundPosition: "30px 0, 30px 0, 0 0, 0 0",
            backgroundSize: "60px 60px",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-lime-300/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/70">
              <Sprout className="h-3.5 w-3.5 animate-sway" /> Invernadero
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greenhouse.name}</h1>
            {greenhouse.description && <p className="mt-1 max-w-xl text-sm text-white/75">{greenhouse.description}</p>}
            <p className="mt-2 text-xs text-white/60">Zona horaria: {greenhouse.timezone}</p>
          </div>
          <div className="flex items-center gap-2">
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
      </div>

      <EditGreenhouseModal
        greenhouse={greenhouse}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDeleted={() => navigate("/greenhouses", { replace: true })}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Cpu, label: "Sensores", value: sensors?.length ?? 0, sub: `${liveSensors} con dato en vivo`, tint: "#16a34a", to: `/greenhouses/${greenhouseId}/sensors` },
          { icon: Power, label: "Actuadores", value: actuators?.length ?? 0, sub: `${actuatorsOn} encendidos`, tint: "#0ea5e9", to: `/greenhouses/${greenhouseId}/actuators` },
          { icon: MapPin, label: "Zonas", value: greenhouse.zones?.length ?? 0, sub: "en este invernadero", tint: "#f59e0b", to: `/greenhouses/${greenhouseId}/zones` },
          { icon: Activity, label: "Eventos en vivo", value: events.length, sub: `${events.filter((e) => e.persisted).length} guardados`, tint: "#8b5cf6", to: "#actividad" },
        ].map((t) => {
          const tileClass =
            "group relative block overflow-hidden rounded-2xl border border-brand-100 bg-white p-4 text-left shadow-sm shadow-brand-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-600/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
          const body = (
            <>
            <span
              className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-15"
              style={{ background: t.tint }}
              aria-hidden
            />
            <span
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${t.tint}1f` }}
            >
              <t.icon className="h-5 w-5" style={{ color: t.tint }} />
            </span>
            <p className="text-2xl font-semibold text-neutral-900">{t.value}</p>
            <p className="text-sm font-medium text-neutral-700">{t.label}</p>
            <p className="text-xs text-neutral-400">{t.sub}</p>
            </>
          );
          // Los tres primeros llevan a su página; "Eventos en vivo" baja a la actividad de esta misma página.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium text-neutral-900">
              <Cpu className="h-4 w-4" /> Sensores
            </h2>
            <Link to={`/greenhouses/${greenhouseId}/sensors`} className="text-sm text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {!sensors?.length ? (
            <p className="text-sm text-neutral-500">Todavía no hay sensores. Agrega uno en la pestaña Sensores.</p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {sensors.slice(0, 6).map((s) => {
                const live = liveBySensor.get(s.id);
                const type = typeById.get(s.sensor_type);
                return (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <Link
                      to={`/greenhouses/${greenhouseId}/sensors/${s.id}`}
                      className="flex items-center gap-3 text-sm text-neutral-800 hover:text-brand-700"
                    >
                      <SensorGauge
                        code={typeCodeById.get(s.sensor_type) ?? ""}
                        typeName={s.sensor_type_name}
                        value={live?.value}
                        min={type?.valid_min ?? null}
                        max={type?.valid_max ?? null}
                        size={36}
                      />
                      {s.name}
                    </Link>
                    <span className="text-sm font-medium text-neutral-700">
                      {live?.value != null ? `${live.value} ${live.unit}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium text-neutral-900">
              <ToggleLeft className="h-4 w-4" /> Actuadores
            </h2>
            <Link to={`/greenhouses/${greenhouseId}/actuators`} className="text-sm text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {!actuators?.length ? (
            <p className="text-sm text-neutral-500">Todavía no hay actuadores.</p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {actuators.slice(0, 6).map((a) => {
                const live = liveByActuator.get(a.id);
                const on = live ? live.state : a.state;
                return (
                  <li key={a.id} className="flex items-center justify-between py-2.5">
                    <Link
                      to={`/greenhouses/${greenhouseId}/actuators/${a.id}`}
                      className="flex items-center gap-3 text-sm text-neutral-800 hover:text-brand-700"
                    >
                      <ActuatorGauge
                        code={actuatorTypeCodeById.get(a.actuator_type) ?? ""}
                        typeName={a.actuator_type_name}
                        on={on}
                        size={36}
                      />
                      {a.name}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        on ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {on ? "Encendido" : "Apagado"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div id="actividad" className="mt-6 scroll-mt-6">
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-medium text-neutral-900">
          <Activity className="h-4 w-4" /> Actividad en vivo
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Lo último que mandaron los sensores. "Guardada" = quedó en la base de datos; "Solo caché" = solo se vio en vivo.
        </p>
        <LiveActivityFeed events={events} limit={8} />
      </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 font-medium text-neutral-900">
          <Users className="h-4 w-4" /> Accesos
        </h2>
        <p className="text-sm text-neutral-500">
          Gestiona quién puede ver u operar este invernadero desde{" "}
          <Link to={`/greenhouses/${greenhouseId}/members`} className="text-brand-600 hover:underline">
            Miembros
          </Link>
          .
        </p>
      </Card>
    </Layout>
  );
}
