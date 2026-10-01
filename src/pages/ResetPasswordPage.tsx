import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useConfirmPasswordReset } from "../hooks/useAuth";
import { formatApiError } from "../lib/api";
import { AuthButton, AuthField, AuthShell, authLinkClass } from "../components/AuthShell";

/**
 * El enlace que manda el email de recuperación apunta a
 * /reset-password?uid=...&token=... (ver README del backend, sección
 * "Recuperación de contraseña"). Este frontend solo tiene que leer esos
 * dos parámetros de la URL y mandarlos junto con la nueva contraseña.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const confirm = useConfirmPasswordReset();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    confirm.mutate({ uid, token, password }, { onSuccess: () => navigate("/login", { replace: true }) });
  }

  if (!uid || !token) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="Este enlace de recuperación no sirve o ya expiró."
        footer={
          <Link to="/login" className={authLinkClass}>
            Volver a iniciar sesión
          </Link>
        }
      >
        <Link
          to="/forgot-password"
          className="block rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-brand-600/30"
        >
          Pedir uno nuevo
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Elige una nueva contraseña" subtitle="Después podrás entrar con ella.">
      <form onSubmit={onSubmit}>
        <AuthField
          label="Nueva contraseña"
          icon={Lock}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          required
        />
        {confirm.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formatApiError(confirm.error)}</p>
        )}
        <AuthButton type="submit" loading={confirm.isPending}>
          Guardar contraseña
        </AuthButton>
      </form>
    </AuthShell>
  );
}
