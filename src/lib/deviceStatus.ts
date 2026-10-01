import type { Device } from "../types";

export type DeviceStatus = "online" | "idle" | "never" | "inactive";

/** Minutos sin ingestar lecturas a partir de los cuales el dispositivo ya no se considera "en línea". */
export const ONLINE_WINDOW_MINUTES = 5;

/**
 * Estado de un dispositivo, sacado solo de lo que el backend expone
 * (`is_active` y `last_seen_at`, que se actualiza en cada ingesta
 * exitosa -- ver README). "En línea" es una convención de la UI: visto
 * hace menos de ONLINE_WINDOW_MINUTES minutos.
 */
export function deviceStatus(d: Pick<Device, "is_active" | "last_seen_at">, now = Date.now()): DeviceStatus {
  if (!d.is_active) return "inactive";
  if (!d.last_seen_at) return "never";
  const minutes = (now - new Date(d.last_seen_at).getTime()) / 60000;
  return minutes <= ONLINE_WINDOW_MINUTES ? "online" : "idle";
}

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: "En línea",
  idle: "Sin señal reciente",
  never: "Nunca ha mandado datos",
  inactive: "Desactivado",
};

export const STATUS_BADGE: Record<DeviceStatus, string> = {
  online: "bg-emerald-100 text-emerald-700",
  idle: "bg-amber-100 text-amber-700",
  never: "bg-neutral-100 text-neutral-500",
  inactive: "bg-neutral-100 text-neutral-500",
};

/** "hace 3 min", "hace 2 h", "hace 4 d". */
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "nunca";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

export type BoardKind = "esp32" | "arduino" | "raspberry";

/** Qué placa dibujar según el nombre del dispositivo (por defecto, ESP32). */
export function boardKind(name: string): BoardKind {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/arduino|uno|nano|mega/.test(n)) return "arduino";
  if (/raspberry|rpi|\bpi\b/.test(n)) return "raspberry";
  return "esp32";
}
