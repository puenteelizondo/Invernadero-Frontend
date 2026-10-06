import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "./useAuth";
import { useGreenhouse } from "./useGreenhouses";
import { api } from "../lib/api";
import { qk } from "../lib/queryClient";
import type { ControlLoop, ControlLoopChange, ControlParams, Page } from "../types";

/** Lazos de control del invernadero (los parámetros viven en el servidor; el cálculo, en el ESP32). */
export function useControlLoops(greenhouseId: number | null) {
  return useQuery({
    queryKey: qk.controlLoops(greenhouseId ?? 0),
    queryFn: async () =>
      (await api.get<Page<ControlLoop>>("/control-loops/", { params: { greenhouse: greenhouseId } })).data.results,
    enabled: greenhouseId != null,
    staleTime: 10_000,
  });
}

export function useCreateLoop(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<ControlParams> & Pick<ControlParams, "name" | "sensor" | "actuator" | "setpoint">) =>
      (await api.post<ControlLoop>("/control-loops/", { ...vars, greenhouse: greenhouseId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.controlLoops(greenhouseId) }),
  });
}

/** Aplica un borrador. El servidor sube `version` y lo empuja al dispositivo. */
export function useUpdateLoop(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<ControlParams> }) =>
      (await api.patch<ControlLoop>(`/control-loops/${id}/`, patch)).data,
    onSuccess: (loop) => {
      qc.setQueryData<ControlLoop[]>(qk.controlLoops(greenhouseId), (old) =>
        old?.map((l) => (l.id === loop.id ? loop : l))
      );
      qc.invalidateQueries({ queryKey: qk.controlHistory(loop.id) });
    },
  });
}

export function useDeleteLoop(greenhouseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/control-loops/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.controlLoops(greenhouseId) }),
  });
}

export function useLoopHistory(loopId: number, enabled: boolean) {
  return useQuery({
    queryKey: qk.controlHistory(loopId),
    queryFn: async () => (await api.get<ControlLoopChange[]>(`/control-loops/${loopId}/history/`)).data,
    enabled,
  });
}

/** ¿Puede el usuario editar lazos? Owner u operator (y staff). El backend lo vuelve a validar. */
export function useCanEditControl(greenhouseId: number | null) {
  const { data: me } = useMe();
  const { data: greenhouse } = useGreenhouse(greenhouseId);
  if (!me) return false;
  if (me.is_staff) return true;
  return greenhouse?.my_role === "owner" || greenhouse?.my_role === "operator";
}
