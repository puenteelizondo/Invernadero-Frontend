import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { SeriesPoint } from "../hooks/useRealtime";

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: SeriesPoint;
}

/**
 * Punto relleno = se guardó como Reading permanente en Postgres.
 * Punto hueco = solo actualizó el "último valor conocido" en caché
 * (política de persistencia del backend) -- nunca vas a poder verlo
 * después en el historial ni en el export a Excel, porque nunca se
 * guardó una fila para él.
 */
function PersistenceDot({ cx, cy, payload, color }: DotProps & { color: string }) {
  if (cx == null || cy == null || !payload) return null;
  return payload.persisted ? (
    <circle cx={cx} cy={cy} r={2.5} fill={color} stroke="rgb(var(--c-surface))" strokeWidth={1} />
  ) : (
    <circle cx={cx} cy={cy} r={2.5} fill="rgb(var(--c-surface))" stroke={color} strokeWidth={1.5} />
  );
}

/**
 * Mini-gráfica que crece sola conforme llegan lecturas por WebSocket
 * (ver useRealtime -- `series`). No pagina ni pide nada al backend:
 * es puramente lo que ha llegado en vivo desde que se abrió la
 * página. Para el historial real y completo, ver SensorDetailPage.
 */
export function LiveSparkline({
  points,
  color = "#16a34a",
  unit,
}: {
  points: SeriesPoint[];
  color?: string;
  unit?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-500">
        <span className="h-1.5 w-1.5 animate-ping1 rounded-full bg-brand-500" aria-hidden />
        Esperando lecturas en vivo…
      </div>
    );
  }

  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number, _name, item) => [
              `${value}${unit ? ` ${unit}` : ""} · ${
                (item?.payload as SeriesPoint | undefined)?.persisted ? "guardada" : "solo caché"
              }`,
              "Valor",
            ]}
            labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
            contentStyle={{ fontSize: 12, borderRadius: 12, background: "rgb(var(--c-surface))", border: "1px solid rgb(var(--c-neutral-200))", color: "rgb(var(--c-neutral-900))", boxShadow: "0 12px 24px -12px rgb(0 0 0 / 0.35)" }}
            cursor={{ stroke: "rgb(var(--c-neutral-300))", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={300}
            dot={<PersistenceDot color={color} />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
