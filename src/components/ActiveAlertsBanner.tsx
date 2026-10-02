import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useActiveAlerts } from "../hooks/useAlerts";

/**
 * Franja roja con las alertas activas del invernadero (no se muestra si no
 * hay ninguna). Lleva a la página de Alertas.
 */
export function ActiveAlertsBanner({ greenhouseId }: { greenhouseId: number }) {
  const { data } = useActiveAlerts(greenhouseId);
  const alerts = data?.results ?? [];
  if (!alerts.length) return null;
  const critical = alerts.some((a) => a.severity === "critical");
  const first = alerts[0];
  const u = first.unit ? ` ${first.unit}` : "";
  return (
    <Link
      to={`/greenhouses/${greenhouseId}/alerts`}
      className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition hover:shadow-md ${
        critical ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <b>{data?.count === 1 ? "1 alerta activa" : `${data?.count} alertas activas`}</b>
        {" · "}
        {first.kind === "stale"
          ? `${first.sensor_name}: sin datos hace ${Math.max(1, Math.round(first.peak_value / 60))} min`
          : `${first.sensor_name}: ${first.kind === "high" ? "superó" : "bajó de"} ${first.threshold}${u} (valor ${first.peak_value}${u})`}
        {alerts.length > 1 && " y más…"}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
