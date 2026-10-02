import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { qk } from "../lib/queryClient";
import type {
  ActuatorStateChangedEventPayload,
  RealtimeEvent,
  SensorReadingEventPayload,
  SnapshotPayload,
} from "../types";

type ConnectionStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface SeriesPoint {
  t: number; // epoch ms, para que recharts pueda ordenar/escalar sin parsear string
  value: number;
  // true si ESTA lectura se guardó como fila permanente en Postgres
  // (Reading), false si solo actualizó el "último valor conocido" en
  // caché -- ver la política de persistencia en el README del backend.
  // Es la única forma de saber esto: /readings/ solo puede devolver
  // lo que sí quedó guardado, nunca lo que se descartó por caché.
  persisted: boolean;
}

export interface LiveEvent {
  id: string;
  sensorId: number;
  sensorName: string;
  value: number;
  unit: string;
  persisted: boolean;
  timestamp: string;
}

// Cuántos puntos recientes guarda cada sensor en memoria para la
// mini-gráfica "en vivo" de SensorsPage. No es historial real (eso
// sigue viviendo en /readings/, ver SensorDetailPage) -- es solo lo
// que ha llegado por WebSocket desde que se abrió esta página.
const LIVE_SERIES_MAX_POINTS = 40;
// Cuántos eventos recientes se guardan para el "feed" de actividad en
// vivo (ver LiveActivityFeed.tsx), sin importar de qué sensor sean.
const LIVE_EVENTS_MAX = 30;

/**
 * Hook de tiempo real para un invernadero.
 *
 * Flujo (ver README del backend, sección "WebSockets / tiempo real"):
 *   1. Pedimos un token corto de un solo uso: POST /api/v1/realtime/ws-token/
 *      (sin body -- solo hace falta estar autenticado; no está atado a
 *      un invernadero en particular). Dura 30 segundos y se consume al
 *      primer intento de conexión, así que se pide justo antes de abrir
 *      el socket. La pertenencia al invernadero se valida aparte, al
 *      conectar, con la Membership real del usuario.
 *   2. Abrimos el socket a /ws/greenhouses/<id>/?token=<token>. El proxy
 *      de Vite (vite.config.ts) reenvía /ws a Django, así que desde el
 *      navegador todo es el mismo origen.
 *   3. El backend manda un "snapshot" inicial y después eventos
 *      "sensor_reading" / "actuator_state_changed" en vivo.
 *
 * El token expira rápido a propósito (evita que quede flotando en el
 * historial de la URL/logs), así que si el socket se cae, pedimos uno
 * nuevo antes de reconectar en vez de reusar el viejo.
 */
export function useRealtime(greenhouseId: number | null) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [series, setSeries] = useState<Record<number, SeriesPoint[]>>({});
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedByUsRef = useRef(false);
  const lastDevicesRefreshRef = useRef(0);

  const handleEvent = useCallback(
    (raw: MessageEvent) => {
      let msg: RealtimeEvent;
      try {
        msg = JSON.parse(raw.data);
      } catch {
        return;
      }

      if (msg.event === "snapshot") {
        const payload = msg.payload as SnapshotPayload;
        setSnapshot(payload);
        // Semilla: un punto inicial por sensor con el último valor
        // conocido, para que la mini-gráfica no arranque vacía si el
        // sensor ya tenía datos antes de abrir esta página.
        setSeries((prev) => {
          const next = { ...prev };
          for (const s of payload.sensors) {
            if (s.value != null && s.timestamp && !next[s.sensor_id]) {
              // No sabemos si ESTE valor puntual se guardó o no (viene
              // del snapshot inicial, no de un evento en vivo) -- lo
              // marcamos persisted:true por default para que se vea
              // como un punto "normal" y no como algo descartado.
              next[s.sensor_id] = [{ t: new Date(s.timestamp).getTime(), value: s.value, persisted: true }];
            }
          }
          return next;
        });
        return;
      }

      if (msg.event === "sensor_reading") {
        const payload = msg.payload as SensorReadingEventPayload;
        setSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sensors: prev.sensors.map((s) =>
              s.sensor_id === payload.sensor_id
                ? { ...s, value: payload.value, timestamp: payload.timestamp }
                : s
            ),
          };
        });
        setSeries((prev) => {
          const existing = prev[payload.sensor_id] ?? [];
          const point: SeriesPoint = {
            t: new Date(payload.timestamp).getTime(),
            value: payload.value,
            persisted: payload.persisted,
          };
          const updated = [...existing, point].slice(-LIVE_SERIES_MAX_POINTS);
          return { ...prev, [payload.sensor_id]: updated };
        });
        setEvents((prev) => {
          const event: LiveEvent = {
            id: `${payload.sensor_id}-${payload.timestamp}-${prev.length}`,
            sensorId: payload.sensor_id,
            sensorName: payload.sensor_name,
            value: payload.value,
            unit: payload.unit,
            persisted: payload.persisted,
            timestamp: payload.timestamp,
          };
          return [event, ...prev].slice(0, LIVE_EVENTS_MAX);
        });
        // Si hay una página de historial de este sensor abierta, la
        // marcamos como desactualizada en vez de intentar empujarle el
        // dato a mano -- más simple y evita duplicados con la paginación
        // por cursor.
        qc.invalidateQueries({ queryKey: qk.sensorReadings(payload.sensor_id), exact: false });
        // Cada lectura aceptada actualiza `last_seen_at` del dispositivo en
        // el backend: refrescamos la lista de dispositivos (estado "en
        // línea") como máximo cada 10 s para no pedirla en cada lectura.
        const nowMs = Date.now();
        if (greenhouseId && nowMs - lastDevicesRefreshRef.current > 10_000) {
          lastDevicesRefreshRef.current = nowMs;
          qc.invalidateQueries({ queryKey: qk.devices(greenhouseId) });
        }
        return;
      }

      if (msg.event === "alert_opened" || msg.event === "alert_resolved" || msg.event === "alert_acknowledged") {
        // Las alertas se leen por HTTP (para tener historial paginado); el evento solo avisa que cambiaron.
        if (greenhouseId) {
          qc.invalidateQueries({ queryKey: qk.alertsAll(greenhouseId) });
          qc.invalidateQueries({ queryKey: qk.alertRules(greenhouseId) });
        }
        return;
      }

      if (msg.event === "actuator_state_changed") {
        const payload = msg.payload as ActuatorStateChangedEventPayload;
        setSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            actuators: prev.actuators.map((a) =>
              a.actuator_id === payload.actuator_id ? { ...a, state: payload.state } : a
            ),
          };
        });
        if (greenhouseId) {
          qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) });
        }
        qc.invalidateQueries({ queryKey: qk.actuator(payload.actuator_id) });
        qc.invalidateQueries({ queryKey: qk.actuatorHistory(payload.actuator_id) });
      }
    },
    [qc, greenhouseId]
  );

  useEffect(() => {
    if (!greenhouseId) return;
    closedByUsRef.current = false;
    retryRef.current = 0;

    let cancelled = false;

    async function connect() {
      setStatus("connecting");
      try {
        const { data } = await api.post<{ token: string; expires_in: number }>("/realtime/ws-token/");
        if (cancelled) return;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${protocol}://${window.location.host}/ws/greenhouses/${greenhouseId}/?token=${encodeURIComponent(
          data.token
        )}`;
        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
          if (cancelled) return;
          setStatus("open");
          retryRef.current = 0;
        };
        socket.onmessage = handleEvent;
        socket.onerror = () => {
          if (cancelled) return;
          setStatus("error");
        };
        socket.onclose = () => {
          if (cancelled) return;
          setStatus("closed");
          socketRef.current = null;
          if (closedByUsRef.current) return;
          // Backoff simple: 1s, 2s, 4s... tope 30s.
          const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
          retryRef.current += 1;
          setTimeout(() => {
            if (!cancelled) connect();
          }, delay);
        };
      } catch {
        if (!cancelled) {
          setStatus("error");
          const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
          retryRef.current += 1;
          setTimeout(() => {
            if (!cancelled) connect();
          }, delay);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      closedByUsRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
      setSnapshot(null);
      setSeries({});
      setEvents([]);
      setStatus("idle");
    };
  }, [greenhouseId, handleEvent]);

  return { status, snapshot, series, events };
}
