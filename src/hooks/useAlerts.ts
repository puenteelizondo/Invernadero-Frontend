import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { qk } from "../lib/queryClient";
import type { Alert, AlertRule, AlertRuleType, AlertSeverity } from "../types";

interface Page<T> {
  count: number;
  next: string | null;
  results: T[];
}

/** Campos editables de una regla (sensor solo al crear). */
export interface AlertRuleFormValues {
  sensor: number;
  name: string;
  rule_type: AlertRuleType;
  min_value: number | null;
  max_value: number | null;
  duration_seconds: number;
  severity: AlertSeverity;
  is_active: boolean;
  notify_email: boolean;
}

/** Reglas de un invernadero (el backend pagina de 20 en 20: se piden todas las páginas). */
export function useAlertRules(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.alertRules(greenhouseId ?? 0),
    enabled: greenhouseId != null,
    queryFn: async () => {
      const out: AlertRule[] = [];
      for (let page = 1; ; page++) {
        const { data } = await api.get<Page<AlertRule>>("/alert-rules/", {
          params: { greenhouse: greenhouseId, page },
        });
        out.push(...data.results);
        if (!data.next) return out;
      }
    },
  });
}

function invalidateAlerts(qc: ReturnType<typeof useQueryClient>, greenhouseId: number) {
  qc.invalidateQueries({ queryKey: qk.alertRules(greenhouseId) });
  qc.invalidateQueries({ queryKey: qk.alertsAll(greenhouseId) });
}

export function useCreateAlertRule(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AlertRuleFormValues) => (await api.post<AlertRule>("/alert-rules/", values)).data,
    onSuccess: () => invalidateAlerts(qc, greenhouseId),
  });
}

export function useUpdateAlertRule(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: { id: number } & Partial<AlertRuleFormValues>) =>
      (await api.patch<AlertRule>(`/alert-rules/${id}/`, rest)).data,
    onSuccess: () => invalidateAlerts(qc, greenhouseId),
  });
}

export function useDeleteAlertRule(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/alert-rules/${id}/`),
    onSuccess: () => invalidateAlerts(qc, greenhouseId),
  });
}

/** Una página de alertas (`status`: "active" | "resolved" | "" para todas). */
export function useAlerts(greenhouseId: number | null, status: "active" | "resolved" | "", page = 1) {
  return useQuery({
    queryKey: qk.alerts(greenhouseId ?? 0, status, page),
    enabled: greenhouseId != null,
    // Respaldo por si el WebSocket no está abierto (solo lo abren algunas páginas).
    refetchInterval: 20_000,
    queryFn: async () =>
      (await api.get<Page<Alert>>("/alerts/", { params: { greenhouse: greenhouseId, status: status || undefined, page } }))
        .data,
  });
}

/** Alertas activas (para el aviso del menú, el banner y las tarjetas de sensor). */
export function useActiveAlerts(greenhouseId: number | null) {
  return useAlerts(greenhouseId, "active", 1);
}

export function useAcknowledgeAlert(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Alert>(`/alerts/${id}/acknowledge/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alertsAll(greenhouseId) }),
  });
}

/** Limpia el historial: borra las alertas RESUELTAS (solo Owner). Sin `olderThanDays`, todas las resueltas. */
export function usePurgeAlerts(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (olderThanDays: number | null) =>
      (
        await api.post<{ deleted: number }>("/alerts/purge/", {
          greenhouse: greenhouseId,
          ...(olderThanDays != null ? { older_than_days: olderThanDays } : {}),
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alertsAll(greenhouseId) }),
  });
}
