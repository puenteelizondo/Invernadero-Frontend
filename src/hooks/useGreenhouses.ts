import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useMe } from "./useAuth";
import { qk } from "../lib/queryClient";
import type {
  Actuator,
  ActuatorStateHistoryEntry,
  ActuatorType,
  CursorPage,
  Device,
  Greenhouse,
  Membership,
  Page,
  Reading,
  Sensor,
  SensorType,
  Zone,
} from "../types";

// -- Invernaderos ----------------------------------------------------

export function useGreenhouses() {
  return useQuery({
    queryKey: qk.greenhouses,
    queryFn: async () => (await api.get<Page<Greenhouse>>("/greenhouses/")).data.results,
  });
}

export function useGreenhouse(id: number | null) {
  return useQuery({
    queryKey: qk.greenhouse(id ?? 0),
    queryFn: async () => (await api.get<Greenhouse>(`/greenhouses/${id}/`)).data,
    enabled: id != null,
  });
}

export function useCreateGreenhouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string; description?: string; timezone?: string }) =>
      (await api.post<Greenhouse>("/greenhouses/", vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.greenhouses }),
  });
}

export interface GreenhouseFormValues {
  name: string;
  description: string;
  timezone: string;
  is_active: boolean;
}

export function useUpdateGreenhouse(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<GreenhouseFormValues>) =>
      (await api.patch<Greenhouse>(`/greenhouses/${id}/`, vars)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.greenhouses });
      qc.invalidateQueries({ queryKey: qk.greenhouse(id) });
    },
  });
}

export function useDeleteGreenhouse(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.delete(`/greenhouses/${id}/`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: qk.greenhouse(id) });
      qc.invalidateQueries({ queryKey: qk.greenhouses });
    },
  });
}

/**
 * ¿Puede este usuario modificar/eliminar el invernadero? El backend solo
 * lo permite a Owners (y al staff). Mientras no se sepa, se asume que sí
 * y es el backend quien responde 403 si no -- así nunca se oculta algo
 * por un fallo al leer las membresías.
 */
export function useCanManageGreenhouse(greenhouseId: number | null) {
  const { data: me } = useMe();
  const { data: memberships } = useMemberships(greenhouseId);
  if (!me) return false;
  if (me.is_staff) return true;
  const mine = memberships?.find((m) => m.user === me.id);
  return mine ? mine.role === "owner" : memberships == null;
}

// -- Zonas ------------------------------------------------------------
// CRUD completo en /api/v1/zones/ (ZoneViewSet), filtrable por
// ?greenhouse=<id>. Sirven para agrupar sensores/actuadores dentro de
// un invernadero (ej. "Mesa 1", "Túnel norte"); son opcionales -- un
// sensor/actuador puede no tener zone.

export function useZones(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.zones(greenhouseId ?? 0),
    queryFn: async () => (await api.get<Page<Zone>>("/zones/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
  });
}

export function useCreateZone(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string; description?: string }) =>
      (await api.post<Zone>("/zones/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.zones(greenhouseId) });
      // El invernadero completo (GET /greenhouses/:id/) también trae
      // `zones` anidado -- lo invalidamos para que el selector de la
      // barra lateral y cualquier otra vista que lo use no se quede
      // desactualizada.
      qc.invalidateQueries({ queryKey: qk.greenhouse(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.greenhouses });
    },
  });
}

export function useUpdateZone(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; name?: string; description?: string }) => {
      const { id, ...rest } = vars;
      return (await api.patch<Zone>(`/zones/${id}/`, rest)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.zones(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.greenhouse(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.greenhouses });
    },
  });
}

export function useDeleteZone(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/zones/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.zones(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.greenhouse(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.greenhouses });
      // Sensores/actuadores que tenían esta zone pueden haber quedado
      // con zone=null en el backend (SET_NULL) -- refrescamos ambos.
      qc.invalidateQueries({ queryKey: qk.sensors(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) });
    },
  });
}

// -- Catálogos (sensor/actuator types) --------------------------------

/** Trae TODAS las páginas de un listado (el backend pagina de 20 en 20). */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const data = (await api.get<Page<T>>(path, { params: { page } })).data;
    out.push(...data.results);
    if (!data.next) return out;
    page += 1;
  }
}

export function useSensorTypes() {
  return useQuery({
    queryKey: qk.sensorTypes,
    queryFn: () => fetchAllPages<SensorType>("/sensor-types/"),
  });
}

/**
 * Sensor (GET /sensors/) solo trae `sensor_type_name` (el NOMBRE, ej.
 * "Temperatura"), nunca el `code` (ej. "temperature") -- el código
 * solo viaja en los eventos de WebSocket y en /readings/. Para poder
 * elegir el ícono/animación correctos de sensorPresets.ts (que
 * emparejan por `code`) hace falta cruzar sensor_type (el id) contra
 * el catálogo de /sensor-types/. Este hook arma ese mapa una sola vez.
 */
export function useSensorTypeCodeMap(): Map<number, string> {
  const { data: sensorTypes } = useSensorTypes();
  return new Map((sensorTypes ?? []).map((t) => [t.id, t.code]));
}

/** Tipos de sensor que se pueden usar en un invernadero: los globales y los propios de él. */
export function useSensorTypesFor(greenhouseId: number) {
  const q = useSensorTypes();
  const data = useMemo(
    () => q.data?.filter((t) => t.greenhouse == null || t.greenhouse === greenhouseId),
    [q.data, greenhouseId]
  );
  return { ...q, data };
}

export function useCreateSensorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<SensorType>) => (await api.post<SensorType>("/sensor-types/", vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sensorTypes }),
  });
}

export function useActuatorTypes() {
  return useQuery({
    queryKey: qk.actuatorTypes,
    queryFn: () => fetchAllPages<ActuatorType>("/actuator-types/"),
  });
}

/** Tipos de actuador que se pueden usar en un invernadero: los globales y los propios de él. */
export function useActuatorTypesFor(greenhouseId: number) {
  const q = useActuatorTypes();
  const data = useMemo(
    () => q.data?.filter((t) => t.greenhouse == null || t.greenhouse === greenhouseId),
    [q.data, greenhouseId]
  );
  return { ...q, data };
}

export function useUpdateActuatorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: number } & Partial<ActuatorType>) =>
      (await api.patch<ActuatorType>(`/actuator-types/${id}/`, rest)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.actuatorTypes }),
  });
}

export function useDeleteActuatorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/actuator-types/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.actuatorTypes }),
  });
}

export function useCreateActuatorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<ActuatorType>) => (await api.post<ActuatorType>("/actuator-types/", vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.actuatorTypes }),
  });
}

/** Igual que useSensorTypeCodeMap, pero para Actuator: `actuator_type_name`
 * tampoco trae el `code`, solo el nombre -- hace falta cruzar contra
 * /actuator-types/ para poder elegir el ícono correcto por código. */
export function useActuatorTypeCodeMap(): Map<number, string> {
  const { data: actuatorTypes } = useActuatorTypes();
  return new Map((actuatorTypes ?? []).map((t) => [t.id, t.code]));
}

// -- Dispositivos ------------------------------------------------------

export function useDevices(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.devices(greenhouseId ?? 0),
    queryFn: async () =>
      (await api.get<Page<Device>>("/devices/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
  });
}

export function useCreateDevice(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string }) =>
      (await api.post<Device>("/devices/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices(greenhouseId) }),
  });
}

export function useRotateDeviceKey(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: number) => (await api.post<Device>(`/devices/${deviceId}/rotate-key/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices(greenhouseId) }),
  });
}

export function useUpdateDevice(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; name?: string; is_active?: boolean }) => {
      const { id, ...rest } = vars;
      return (await api.patch<Device>(`/devices/${id}/`, rest)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices(greenhouseId) }),
  });
}

export function useDeleteDevice(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/devices/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.devices(greenhouseId) }),
  });
}

// -- Sensores -----------------------------------------------------------
// Nota: este frontend NUNCA manda lecturas manuales (POST /readings/) --
// eso es trabajo exclusivo de los controladores físicos vía API key de
// dispositivo. Aquí solo se crean/editan/leen sensores y su historial.

export function useSensors(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.sensors(greenhouseId ?? 0),
    queryFn: async () =>
      (await api.get<Page<Sensor>>("/sensors/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
  });
}

export function useSensor(id: number | null) {
  return useQuery({
    queryKey: qk.sensor(id ?? 0),
    queryFn: async () => (await api.get<Sensor>(`/sensors/${id}/`)).data,
    enabled: id != null,
  });
}

export interface SensorFormValues {
  name: string;
  sensor_type: number;
  device?: number | null;
  zone?: number | null;
  unit?: string;
  description?: string;
  reading_interval_seconds?: number;
  persist_interval_seconds?: number | null;
  persist_deadband?: number | null;
  is_active?: boolean;
}

export function useCreateSensor(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SensorFormValues) =>
      (await api.post<Sensor>("/sensors/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sensors(greenhouseId) }),
  });
}

export function useUpdateSensor(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number } & Partial<SensorFormValues>) => {
      const { id, ...rest } = vars;
      return (await api.patch<Sensor>(`/sensors/${id}/`, rest)).data;
    },
    onSuccess: (sensor) => {
      qc.invalidateQueries({ queryKey: qk.sensors(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.sensor(sensor.id) });
    },
  });
}

export function useUpdateSensorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: number } & Partial<SensorType>) =>
      (await api.patch<SensorType>(`/sensor-types/${id}/`, rest)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sensorTypes }),
  });
}

export function useDeleteSensorType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/sensor-types/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sensorTypes }),
  });
}

/**
 * Borrado explícito de un sensor CON todas sus lecturas
 * (POST /sensors/{id}/purge/). Solo Owner; hay que mandar el nombre exacto.
 */
export function usePurgeSensor(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; confirm_name: string }) =>
      (
        await api.post<{ sensor_id: number; name: string; readings_deleted: number }>(
          `/sensors/${vars.id}/purge/`,
          { confirm_name: vars.confirm_name }
        )
      ).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.sensors(greenhouseId) });
      qc.removeQueries({ queryKey: qk.sensor(r.sensor_id) });
      qc.removeQueries({ queryKey: qk.sensorReadings(r.sensor_id) });
    },
  });
}

/**
 * Borrado explícito de un actuador CON todo su historial de estados
 * (POST /actuators/{id}/purge/). Solo Owner; hay que mandar el nombre exacto.
 */
export function usePurgeActuator(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; confirm_name: string }) =>
      (
        await api.post<{ actuator_id: number; name: string; history_deleted: number }>(
          `/actuators/${vars.id}/purge/`,
          { confirm_name: vars.confirm_name }
        )
      ).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) });
      qc.removeQueries({ queryKey: qk.actuator(r.actuator_id) });
      qc.removeQueries({ queryKey: qk.actuatorHistory(r.actuator_id) });
    },
  });
}

export function useDeleteSensor(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/sensors/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sensors(greenhouseId) }),
  });
}

export function useSensorReadings(sensorId: number | null, params: { since?: string; until?: string } = {}) {
  return useQuery({
    queryKey: [...qk.sensorReadings(sensorId ?? 0), params],
    queryFn: async () =>
      (
        await api.get<CursorPage<Reading>>("/readings/", {
          params: { sensor: sensorId, ...params },
        })
      ).data.results,
    enabled: sensorId != null,
  });
}

// -- Actuadores -----------------------------------------------------------

export function useActuators(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.actuators(greenhouseId ?? 0),
    queryFn: async () =>
      (await api.get<Page<Actuator>>("/actuators/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
  });
}

export function useActuator(id: number | null) {
  return useQuery({
    queryKey: qk.actuator(id ?? 0),
    queryFn: async () => (await api.get<Actuator>(`/actuators/${id}/`)).data,
    enabled: id != null,
  });
}

export interface ActuatorFormValues {
  name: string;
  actuator_type: number;
  device?: number | null;
  zone?: number | null;
  description?: string;
  is_active?: boolean;
}

export function useCreateActuator(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: ActuatorFormValues) =>
      (await api.post<Actuator>("/actuators/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) }),
  });
}

export function useUpdateActuator(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number } & Partial<ActuatorFormValues>) => {
      const { id, ...rest } = vars;
      return (await api.patch<Actuator>(`/actuators/${id}/`, rest)).data;
    },
    onSuccess: (actuator) => {
      qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.actuator(actuator.id) });
    },
  });
}

export function useDeleteActuator(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/actuators/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) }),
  });
}

interface ActuatorStateChangeResult {
  actuator_id: number;
  name: string;
  state: boolean;
  changed: boolean;
  updated_at: string;
}

/**
 * Encender/apagar un actuador a mano (source="manual" en el backend).
 * El endpoint real es POST /actuators/{id}/state/ (la acción se llama
 * "state", sin url_path propio -- ver apps/actuators/views.py) y
 * devuelve solo {actuator_id, name, state, changed, updated_at}, no el
 * Actuator completo, así que invalidamos en vez de usar la respuesta
 * como si fuera la fuente de verdad.
 */
export function useSetActuatorState(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; state: boolean }) =>
      (await api.post<ActuatorStateChangeResult>(`/actuators/${vars.id}/state/`, { state: vars.state })).data,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: qk.actuators(greenhouseId) });
      qc.invalidateQueries({ queryKey: qk.actuator(result.actuator_id) });
      qc.invalidateQueries({ queryKey: qk.actuatorHistory(result.actuator_id) });
    },
  });
}

export function useActuatorHistory(actuatorId: number | null) {
  return useQuery({
    queryKey: qk.actuatorHistory(actuatorId ?? 0),
    queryFn: async () =>
      (await api.get<Page<ActuatorStateHistoryEntry>>(`/actuators/${actuatorId}/history/`)).data.results,
    enabled: actuatorId != null,
  });
}

// -- Membresías -----------------------------------------------------------

export function useMemberships(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.memberships(greenhouseId ?? 0),
    queryFn: async () =>
      (await api.get<Page<Membership>>("/memberships/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
  });
}

export function useInviteMember(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { invite: string; role: Membership["role"] }) =>
      (await api.post<Membership>("/memberships/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.memberships(greenhouseId) }),
  });
}

export function useUpdateMembershipRole(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; role: Membership["role"] }) =>
      (await api.patch<Membership>(`/memberships/${vars.id}/`, { role: vars.role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.memberships(greenhouseId) }),
  });
}

export function useRemoveMembership(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/memberships/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.memberships(greenhouseId) }),
  });
}

// -- Exportación a Excel ---------------------------------------------------
// GET /api/v1/readings/export/?date_from=...&date_to=...&sensor=<opcional>
// No es "por invernadero": el backend ya limita el resultado a los
// invernaderos de los que eres miembro, y "sensor" es un filtro extra
// opcional dentro de ese rango (ver apps/readings/views.py::ReadingExportView).

export interface ExportReadingsParams {
  dateFrom: string; // ISO 8601
  dateTo: string; // ISO 8601
  sensorId?: number;
}

/** Descarga el .xlsx de lecturas que genera el backend para un rango de fechas. */
export async function downloadReadingsExport(params: ExportReadingsParams) {
  const response = await api.get("/readings/export/", {
    responseType: "blob",
    params: {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      sensor: params.sensorId,
    },
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "lecturas.xlsx";

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
