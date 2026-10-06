import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { qk } from "../lib/queryClient";
import type { User } from "../types";

/**
 * Sesión del usuario actual. Se basa en /auth/me/: si el navegador no
 * tiene una sesión válida (cookie sessionid), el backend responde 401
 * y `me` queda en `undefined` -- eso es lo que ProtectedRoute usa para
 * decidir si redirige a /login.
 */
export function useMe() {
  return useQuery<User>({
    queryKey: qk.me,
    queryFn: async () => (await api.get<User>("/auth/me/")).data,
    retry: false,
    // Un 401 es normal (no hay sesión), no un error de red -- no
    // reintentar ni tratarlo como "algo se rompió" en la UI.
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { username: string; password: string }) =>
      (await api.post<User>("/auth/login/", vars)).data,
    onSuccess: (user) => {
      qc.setQueryData(qk.me, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  function finish() {
    // Se limpia TODO el caché (incluida la sesión) y se navega a mano a
    // /login. Antes solo se limpiaba el caché y se esperaba a que
    // ProtectedRoute lo notara solo; si la petición fallaba, o el
    // caché tardaba en reaccionar, el usuario se quedaba en la misma
    // pantalla sin que pasara nada.
    qc.clear();
    navigate("/login", { replace: true });
  }

  return useMutation({
    mutationFn: async () => (await api.post("/auth/logout/")).data,
    onSuccess: finish,
    onError: (error) => {
      // 401 = ya no había sesión en el servidor: para el usuario da lo
      // mismo, ya está "afuera". Cualquier otro error (p. ej. 403 de
      // CSRF, sin red) SÍ deja la sesión viva, así que no se finge que
      // se cerró: la UI muestra el error (ver Sidebar).
      if (axios.isAxiosError(error) && error.response?.status === 401) finish();
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (vars: { email: string }) =>
      (await api.post("/auth/password-reset/", vars)).data,
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async (vars: { uid: string; token: string; password: string }) =>
      (await api.post("/auth/password-reset/confirm/", vars)).data,
  });
}
