import { Database, HardDriveDownload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { LiveEvent } from "../hooks/useRealtime";
import { useCalm } from "../lib/motion";

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
  const calm = useCalm();

  if (!shown.length) {
    return <p className="text-sm text-neutral-500">Todavía no ha llegado ningún evento en vivo. En cuanto un dispositivo mande datos, aparecerán aquí.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200/70">
      <AnimatePresence initial={false}>
      {shown.map((e) => (
        <motion.li
          key={e.id}
          layout={!calm}
          initial={calm ? false : { opacity: 0, backgroundColor: "rgb(var(--c-brand-100) / 0.9)" }}
          animate={{ opacity: 1, backgroundColor: "rgb(var(--c-brand-100) / 0)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate text-neutral-800">{e.sensorName}</p>
            <p className="num text-xs text-neutral-500">{new Date(e.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="num font-medium text-neutral-800">
              {e.value} {e.unit}
            </span>
            {e.persisted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Database className="h-3 w-3" /> Guardada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                <HardDriveDownload className="h-3 w-3" /> Solo caché
              </span>
            )}
          </div>
        </motion.li>
      ))}
      </AnimatePresence>
    </ul>
  );
}
