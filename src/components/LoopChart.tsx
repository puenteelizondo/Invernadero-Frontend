import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LoopPoint } from "../hooks/useRealtime";

const tipStyle = {
  fontSize: 12,
  borderRadius: 12,
  background: "rgb(var(--c-surface))",
  border: "1px solid rgb(var(--c-neutral-200))",
  color: "rgb(var(--c-neutral-900))",
  boxShadow: "0 12px 24px -12px rgb(0 0 0 / 0.35)",
};

const time = (t: number) => new Date(t).toLocaleTimeString("es-MX", { hour12: false });

/**
 * Gráfica en vivo del lazo: medición (PV) contra setpoint arriba, y la salida
 * del controlador (%) en una franja aparte abajo. Todo viene de la telemetría
 * que el ESP32 manda por WebSocket; nada se calcula aquí.
 */
export function LoopChart({ points, unit }: { points: LoopPoint[]; unit: string }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 text-center text-sm text-neutral-500">
        <span className="h-1.5 w-1.5 shrink-0 animate-ping1 rounded-full bg-brand-500" aria-hidden />
        Esperando telemetría del controlador…
      </div>
    );
  }
  const data = points.map((p) => ({ ...p, pv: p.pv ?? undefined, output: p.output ?? undefined }));
  const margin = { top: 6, right: 8, bottom: 0, left: 0 };
  return (
    <div role="img" aria-label="Gráfica en vivo de la medición, el setpoint y la salida del lazo">
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
            <CartesianGrid stroke="rgb(var(--c-neutral-200))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis
              width={44}
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              tick={{ fontSize: 11, fill: "rgb(var(--c-neutral-500))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals
            />
            <Tooltip
              contentStyle={tipStyle}
              labelFormatter={(t) => time(t as number)}
              formatter={(v: number, name) => [`${Math.round(v * 100) / 100} ${unit}`, name === "pv" ? "Medición" : "Setpoint"]}
              cursor={{ stroke: "rgb(var(--c-neutral-300))", strokeDasharray: "3 3" }}
            />
            <Line type="stepAfter" dataKey="setpoint" stroke="rgb(var(--c-neutral-500))" strokeWidth={1.6} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="pv" stroke="rgb(var(--c-brand-500))" strokeWidth={2.4} dot={false} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-[56px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ ...margin, top: 2 }}>
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis width={44} domain={[0, 100]} ticks={[0, 100]} tick={{ fontSize: 11, fill: "rgb(var(--c-neutral-500))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={tipStyle} labelFormatter={(t) => time(t as number)} formatter={(v: number) => [`${Math.round(v * 10) / 10} %`, "Salida"]} cursor={{ stroke: "rgb(var(--c-neutral-300))", strokeDasharray: "3 3" }} />
            <Area type="stepAfter" dataKey="output" stroke="rgb(var(--c-amber-500))" strokeWidth={1.8} fill="rgb(var(--c-amber-400))" fillOpacity={0.28} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600" aria-hidden>
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-brand-500" /> Medición</li>
        <li className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-neutral-500" /> Setpoint</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-amber-400/40 ring-1 ring-amber-500" /> Salida %</li>
      </ul>
    </div>
  );
}
