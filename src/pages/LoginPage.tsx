import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, User } from "lucide-react";
import { useLogin, useMe } from "../hooks/useAuth";
import { formatApiError } from "../lib/api";
import { AuthButton, AuthField, AuthShell } from "../components/AuthShell";

export function LoginPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  if (me) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/greenhouses";
    return <Navigate to={from} replace />;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ username, password }, { onSuccess: () => navigate("/greenhouses", { replace: true }) });
  }

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Entra para ver cómo va tu invernadero."
      footer={<>¿Necesitas acceso? Pídeselo a tu administrador.</>}
    >
      <form onSubmit={onSubmit}>
        <AuthField
          label="Usuario"
          icon={User}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <AuthField
          label="Contraseña"
          icon={Lock}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <div className="mb-4 -mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {login.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formatApiError(login.error)}</p>
        )}
        <AuthButton type="submit" loading={login.isPending}>
          Entrar
        </AuthButton>
      </form>
    </AuthShell>
  );
}
