import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { qk } from "../lib/queryClient";
import type { AdminUser, Page } from "../types";

/** Gestión de cuentas: solo para administradores (is_staff). Ver /api/v1/admin/users/. */
export function useAdminUsers(search: string, page: number, enabled = true) {
  return useQuery({
    queryKey: [...qk.adminUsers, search, page],
    queryFn: async () =>
      (await api.get<Page<AdminUser>>("/admin/users/", { params: { search: search || undefined, page } })).data,
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { username: string; email?: string; password?: string; is_staff: boolean }) =>
      (await api.post<AdminUser>("/admin/users/", vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: number } & Partial<Pick<AdminUser, "is_active" | "is_staff" | "email">>) =>
      (await api.patch<AdminUser>(`/admin/users/${id}/`, patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ id: number; username: string; temporary_password: string | null }>(
        `/admin/users/${id}/reset-password/`,
        {}
      )).data,
  });
}
