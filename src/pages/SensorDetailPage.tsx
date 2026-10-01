import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    <circle cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1} />
  ) : (
    <circle cx={cx} cy={cy} r={3} fill="white" stroke={color} strokeWidth={1.5} />
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

      <Card className="mb-6 bg-gradient-to-br from-white to-brand-50/50">
        <div className="flex items-center gap-4">
          <SensorGauge
            code={code}
            typeName={sensor.sensor_type_name}
            value={live?.value}
            min={type?.valid_min ?? null}
            max={type?.valid_max ?? null}
            size={84}
          />
          <div>
            <p className="text-2xl font-semibold text-neutral-900">
              {live?.value != null ? `${live.value} ${live.unit}` : "Sin dato en vivo"}
            </p>
            <p className="text-xs text-neutral-500">
              {live?.timestamp ? `Última lectura: ${new Date(live.timestamp).toLocaleString()}` : sensor.description}
            </p>
          </div>
        </div>
      </Card>

      <SensorConnectPanel sensor={sensor} greenhouseId={greenhouseId} />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-neutral-900">Historial (en vivo)</h2>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="3" fill={preset?.hex ?? "#16a34a"} />
              </svg>
              Guardada
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10">
                <circle cx="5" cy="5" r="3" fill="white" stroke={preset?.hex ?? "#16a34a"} strokeWidth={1.5} />
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
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="time" hide />
                <YAxis width={40} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, _name, item) => [
                    `${value}${live?.unit ? ` ${live.unit}` : ""} · ${
                      (item?.payload as { persisted?: boolean } | undefined)?.persisted ? "guardada" : "solo caché"
                    }`,
                    "Valor",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={preset?.hex ?? "#16a34a"}
                  strokeWidth={2}
                  dot={<ChartDot color={preset?.hex ?? "#16a34a"} />}
                  isAnimationActive
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-medium text-neutral-900">Actividad en vivo</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Cada evento que llega por WebSocket para este sensor, con si se guardó de verdad como lectura permanente o
          solo actualizó el último valor en caché.
        </p>
        <LiveActivityFeed events={sensorEvents} />
      </Card>
    </Layout>
  );
}
