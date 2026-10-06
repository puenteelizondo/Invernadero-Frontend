import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { useCalm } from "../lib/motion";
import { useSensor, useSensorReadings, useSensorTypeCodeMap, useSensorTypes } from "../hooks/useGreenhouses";
import { useRealtime } from "../hooks/useRealtime";
import { findSensorPreset } from "../lib/sensorPresets";
import { Layout } from "../components/Layout";
import { SensorGauge } from "../components/SensorGauge";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { SensorConnectPanel } from "../components/SensorConnectPanel";
import { EditSensorModal } from "../components/EditSensorModal";
import { Button, Card, EmptyState, PageHeader, Spinner } from "../components/ui";
import { ConnectionBadge } from "../components/ConnectionBadge";

interface ChartDotProps {
  cx?: number;
  cy?: number;
  payload?: { persisted?: boolean };
}

/**
 * Mismo criterio visual que PersistenceDot en LiveSparkline.tsx: punto
 * relleno = se guardó como Reading permanente en Postgres, punto hueco
 * = solo actualizó el "último valor conocido" en caché. Ver la
 * política de persistencia en el README del backend.
 */
function ChartDot({ cx, cy, payload, color }: ChartDotProps & { color: string }) {
  if (cx == null || cy == null || !payload) return null;
  return payload.persisted ? (
    <circle cx={cx} cy={cy} r={3} fill={color} stroke="rgb(var(--c-surface))" strokeWidth={1} />
  ) : (
    <circle cx={cx} cy={cy} r={3} fill="rgb(var(--c-surface))" stroke={color} strokeWidth={1.5} />
  );
}

/**
 * Historial de un sensor. Solo lectura -- las lecturas nuevas llegan
 * solas por WebSocket. No hay ningún formulario aquí para escribir un
 * valor a mano.
 *
 * La gráfica combina el historial real (GET /readings/, paginado) con
 * los puntos que han llegado en vivo desde que se abrió la página
 * (useRealtime -- `series`), para que se vea crecer al instante en
 * cuanto llega un dato nuevo, sin esperar al round-trip del refetch
 * que también dispara useRealtime en segundo plano.
 */
export function SensorDetailPage() {
  const { id, sensorId } = useParams();
  const greenhouseId = Number(id);
  const numericSensorId = Number(sensorId);
  const { data: sensor, isLoading } = useSensor(numericSensorId);
  const [editing, setEditing] = useState(false);
  const { data: readings } = useSensorReadings(numericSensorId);
  const typeCodeById = useSensorTypeCodeMap();
  const { data: sensorTypes } = useSensorTypes();
  const { status, snapshot, series, events } = useRealtime(greenhouseId);
  const sensorEvents = events.filter((e) => e.sensorId === numericSensorId);

  const live = snapshot?.sensors.find((s) => s.sensor_id === numericSensorId);
  const code = sensor ? typeCodeById.get(sensor.sensor_type) ?? "" : "";
  const preset = findSensorPreset(code, sensor?.sensor_type_name);
  const type = sensor ? sensorTypes?.find((t) => t.id === sensor.sensor_type) : undefined;

  const chartData = useMemo(() => {
    // Todo lo que viene de /readings/ SÍ se guardó -- por definición,
    // el backend solo crea una fila Reading para lo que decide
    // persistir (ver política de persistencia). No hay tal cosa como
    // un registro histórico de "lecturas descartadas": esas nunca se
    // guardaron, así que solo se pueden ver en vivo mientras llegan
    // (ver LiveActivityFeed más abajo).
    const historical = (readings ?? [])
      .slice()
      .reverse()
      .map((r) => ({ t: new Date(r.timestamp).getTime(), value: r.value, persisted: true }));

    const lastHistoricalT = historical.length ? historical[historical.length - 1].t : 0;
    const live = (series[numericSensorId] ?? []).filter((p) => p.t > lastHistoricalT);

    return [...historical, ...live].map((p) => ({
      time: new Date(p.t).toLocaleString(),
      value: p.value,
      persisted: p.persisted,
    }));
  }, [readings, series, numericSensorId]);

  // Resumen del historial que se ve en la gráfica (solo datos reales).
  const stats = useMemo(() => {
    const vals = chartData.map((p) => p.value).filter((v): v is number => typeof v === "number");
    if (vals.length < 2) return null;
    return { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length };
  }, [chartData]);
  // La línea se "dibuja" al abrir la página; después las lecturas nuevas se agregan sin redibujar todo.
  const calm = useCalm();
  const [drawIn, setDrawIn] = useState(!calm);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawIn(false), 1400);
    return () => window.clearTimeout(t);
  }, []);
  const color = preset?.hex ?? "#2F7E48";

  if (isLoading || !sensor) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={sensor.name}
        subtitle={sensor.sensor_type_name}
        actions={
          <>
            <ConnectionBadge status={status} />
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </>
        }
      />
      <EditSensorModal sensor={editing ? sensor : null} greenhouseId={greenhouseId} onClose={() => setEditing(false)} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <SensorGauge
            code={code}
            typeName={sensor.sensor_type_name}
            value={live?.value}
            min={type?.valid_min ?? null}
            max={type?.valid_max ?? null}
            size={84}
          />
          <div className="min-w-0 flex-1">
            <p className="leading-none">
              {live?.value != null ? (
                <>
                  <span className="font-display text-[2.75rem] font-semibold text-neutral-900">
                    <AnimatedNumber value={live.value} />
                  </span>
                  <span className="ml-1.5 text-lg font-medium text-neutral-500">{live.unit}</span>
                </>
              ) : (
                <span className="font-display text-2xl font-semibold text-neutral-700">Sin dato en vivo</span>
              )}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {live?.timestamp ? `Última lectura: ${new Date(live.timestamp).toLocaleString()}` : sensor.description}
            </p>
          </div>
          {stats && (
            <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[18rem]">
              {[
                ["Mínimo", stats.min],
                ["Promedio", stats.avg],
                ["Máximo", stats.max],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-2">
                  <dt className="text-[11px] text-neutral-500">{label}</dt>
                  <dd className="num text-base font-semibold text-neutral-900">
                    {(v as number).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Card>

      <SensorConnectPanel sensor={sensor} greenhouseId={greenhouseId} />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">Historial (en vivo)</h2>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="3" fill={preset?.hex ?? "#16a34a"} />
              </svg>
              Guardada
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="3" fill="rgb(var(--c-surface))" stroke={preset?.hex ?? "#16a34a"} strokeWidth={1.5} />
              </svg>
              Solo caché
            </span>
          </div>
        </div>
        {!chartData.length ? (
          <EmptyState title="Todavía no hay lecturas guardadas" hint="Aparecerán aquí en cuanto el dispositivo empiece a mandar datos." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgb(var(--c-neutral-200))" strokeDasharray="2 4" />
                <XAxis dataKey="time" hide />
                <YAxis
                  width={48}
                  tick={{ fontSize: 12, fill: "rgb(var(--c-neutral-500))" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  cursor={{ stroke: "rgb(var(--c-neutral-400))", strokeDasharray: "3 3" }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    background: "rgb(var(--c-surface))",
                    border: "1px solid rgb(var(--c-neutral-200))",
                    color: "rgb(var(--c-neutral-900))",
                    boxShadow: "0 12px 24px -12px rgb(0 0 0 / 0.35)",
                  }}
                  labelStyle={{ color: "rgb(var(--c-neutral-500))", marginBottom: 2 }}
                  formatter={(value: number, _name, item) => [
                    `${value}${live?.unit ? ` ${live.unit}` : ""} · ${
                      (item?.payload as { persisted?: boolean } | undefined)?.persisted ? "guardada" : "solo caché"
                    }`,
                    "Valor",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2.25}
                  fill="url(#hist-fill)"
                  dot={<ChartDot color={color} />}
                  activeDot={{ r: 5, stroke: "rgb(var(--c-surface))", strokeWidth: 2, fill: color }}
                  isAnimationActive={drawIn}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900">Actividad en vivo</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Cada evento que llega por WebSocket para este sensor, con si se guardó de verdad como lectura permanente o
          solo actualizó el último valor en caché.
        </p>
        <LiveActivityFeed events={sensorEvents} />
      </Card>
    </Layout>
  );
}
