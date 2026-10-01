import { Database, HardDriveDownload } from "lucide-react";
import type { LiveEvent } from "../hooks/useRealtime";

/**
 * Lista cruda de los últimos eventos "sensor_reading" que llegaron por
 * WebSocket, con la etiqueta de si cada uno se guardó de verdad
 * (Reading en Postgres) o solo pasó por el caché -- para responder
 * directamente "¿cómo veo qué se guarda y qué no?" sin tener que
 * adivinarlo. Ver la política de persistencia en el README del
 * backend, sección "Política de persistencia de lecturas".
 */
export function LiveActivityFeed({ events, limit = 12 }: { events: LiveEvent[]; limit?: number }) {
  const shown = events.slice(0, limit);

  if (!shown.length) {
    return <p className="text-sm text-neutral-400">Todavía no ha llegado ningún evento en vivo.</p>;
  }

  return (
    <ul className="divide-y divide-brand-50">
      {shown.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate text-neutral-800">{e.sensorName}</p>
            <p className="text-xs text-neutral-400">{new Date(e.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-medium text-neutral-700">
              {e.value} {e.unit}
            </span>
            {e.persisted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Database className="h-3 w-3" /> Guardada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                <HardDriveDownload className="h-3 w-3" /> Solo caché
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
