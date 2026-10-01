// Tipos que reflejan exactamente lo que devuelven los serializers del
// backend (ver el README del backend, sección "API completa"). No se
// inventan campos que el backend no manda.

export type Role = "owner" | "operator" | "viewer";

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

export interface Zone {
  id: number;
  greenhouse: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Greenhouse {
  id: number;
  name: string;
  description: string;
  timezone: string;
  is_active: boolean;
  zones: Zone[];
  created_at: string;
  updated_at: string;
}

export interface SensorType {
  id: number;
  code: string;
  name: string;
  default_unit: string;
  valid_min: number | null;
  valid_max: number | null;
  description: string;
  /** null = tipo global (lo administra el staff); con id = propio de ese invernadero. */
  greenhouse: number | null;
  /** ¿Puede el usuario actual editarlo/borrarlo? (lo calcula el backend) */
  can_edit: boolean;
}

export interface Device {
  id: number;
  name: string;
  greenhouse: number;
  key_prefix: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  // Solo presentes justo al crear / rotar la clave (una sola vez):
  api_key?: string;
  warning?: string;
}

export interface Sensor {
  id: number;
  name: string;
  sensor_type: number;
  sensor_type_name: string;
  device: number | null;
  greenhouse: number;
  zone: number | null;
  unit: string;
  effective_unit: string;
  description: string;
  is_active: boolean;
  reading_interval_seconds: number;
  persist_interval_seconds: number | null;
  persist_deadband: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActuatorType {
  id: number;
  code: string;
  name: string;
  description: string;
  greenhouse: number | null;
  can_edit: boolean;
}

export interface Actuator {
  id: number;
  name: string;
  actuator_type: number;
  actuator_type_name: string;
  device: number | null;
  greenhouse: number;
  zone: number | null;
  description: string;
  is_active: boolean;
  state: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActuatorStateHistoryEntry {
  id: number;
  state: boolean;
  changed_by_username: string | null;
  source: "manual" | "automation";
  changed_at: string;
}

export interface Reading {
  id: number;
  sensor: number;
  sensor_name: string;
  sensor_type: string;
  unit: string;
  greenhouse: number;
  timestamp: string;
  value: number;
}

export interface Membership {
  id: number;
  user: number;
  username: string;
  greenhouse: number;
  role: Role;
  created_at: string;
}

// Envoltura estándar de paginación por página (PageNumberPagination).
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Envoltura de paginación por cursor (solo /readings/).
export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

// Sobre de cada evento de WebSocket (ver README del backend,
// sección "WebSockets / tiempo real").
export interface RealtimeEvent<T = unknown> {
  event: "snapshot" | "sensor_reading" | "actuator_state_changed";
  timestamp: string;
  payload: T;
}

export interface SnapshotPayload {
  sensors: Array<{
    sensor_id: number;
    sensor_name: string;
    sensor_type: string;
    unit: string;
    value: number | null;
    timestamp: string | null;
  }>;
  actuators: Array<{
    actuator_id: number;
    name: string;
    state: boolean;
  }>;
}

export interface SensorReadingEventPayload {
  sensor_id: number;
  sensor_name: string;
  sensor_type: string;
  unit: string;
  value: number;
  timestamp: string;
  persisted: boolean;
}

export interface ActuatorStateChangedEventPayload {
  actuator_id: number;
  name: string;
  greenhouse_id: number;
  state: boolean;
  changed_by: string | null;
  source: "manual" | "automation";
}

// Forma común de un 400 de DRF: { campo: ["mensaje", ...] } o
// { non_field_errors: [...] } o { detail: "..." }.
export type ApiErrorBody = Record<string, string[] | string>;
