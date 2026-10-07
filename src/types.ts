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

/** Usuario tal como lo ve un administrador (GET /admin/users/). */
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
  /** Solo viene justo al crear un usuario sin contraseña: se muestra una única vez. */
  temporary_password?: string | null;
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
  /** Tu rol aquí (el staff cuenta como owner). Lo calcula el backend. */
  my_role?: Role | null;
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

export interface Invitation {
  id: number;
  greenhouse: number;
  greenhouse_name: string;
  user: number;
  username: string;
  role: Role;
  status: "pending" | "accepted" | "declined" | "cancelled";
  invited_by_username: string | null;
  created_at: string;
  responded_at: string | null;
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
  event:
    | "snapshot"
    | "sensor_reading"
    | "actuator_state_changed"
    | "alert_opened"
    | "alert_resolved"
    | "alert_acknowledged"
    | "control_loop_updated"
    | "control_loop_applied"
    | "control_loop_deleted"
    | "control_telemetry"
    | "device_connection";
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


// -- Alertas ----------------------------------------------------------
export type AlertSeverity = "warning" | "critical";
export type AlertRuleType = "threshold" | "no_signal";

/** Regla de alerta de un sensor (GET /alert-rules/). */
export interface AlertRule {
  id: number;
  sensor: number;
  sensor_name: string;
  unit: string;
  greenhouse: number;
  name: string;
  rule_type: AlertRuleType;
  min_value: number | null;
  max_value: number | null;
  duration_seconds: number;
  severity: AlertSeverity;
  is_active: boolean;
  notify_email: boolean;
  has_active_alert: boolean;
  created_at: string;
}

/** Un episodio de alerta (GET /alerts/). */
export interface Alert {
  id: number;
  rule: number | null;
  rule_name: string;
  sensor: number;
  sensor_name: string;
  unit: string;
  greenhouse: number;
  /** "stale" = sin señal: threshold = segundos tolerados; trigger/peak_value = segundos sin datos. */
  kind: "high" | "low" | "stale";
  severity: AlertSeverity;
  status: "active" | "resolved";
  threshold: number;
  trigger_value: number;
  peak_value: number;
  opened_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
}


// -- Control (lazos PID/PI/P/On-Off que ejecuta el ESP32) -----------------
export type ControlMode = "off" | "on_off" | "p" | "pi" | "pid";
export type ControlDirection = "direct" | "reverse";

export interface ControlTelemetry {
  loop_id: number;
  greenhouse_id?: number;
  device_id?: number;
  pv: number | null;
  setpoint: number | null;
  output: number | null;
  error: number | null;
  p: number | null;
  i: number | null;
  d: number | null;
  mode: string;
  version: number | null;
  ts: string;
}

/** Parámetros editables de un lazo (lo que viaja al dispositivo). */
export interface ControlParams {
  name: string;
  sensor: number;
  actuator: number;
  mode: ControlMode;
  direction: ControlDirection;
  setpoint: number;
  hysteresis: number;
  kp: number;
  ki: number;
  kd: number;
  output_min: number;
  output_max: number;
  integral_limit: number;
  sample_time_ms: number;
  enabled: boolean;
}

export interface ControlLoop extends ControlParams {
  id: number;
  greenhouse: number;
  device: number;
  sensor_name: string;
  actuator_name: string;
  unit: string;
  valid_min: number | null;
  valid_max: number | null;
  version: number;
  applied_version: number;
  applied_at: string | null;
  pending: boolean;
  updated_by_name: string | null;
  updated_at: string;
  created_at: string;
  device_online: boolean;
  last_telemetry: ControlTelemetry | null;
}

export interface ControlLoopChange {
  id: number;
  version: number;
  changed_by_name: string | null;
  changes: Record<string, { before: unknown; after: unknown }>;
  created_at: string;
}
