import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { useRegister } from "../hooks/useAuth";
import { formatApiError } from "../lib/api";
import { AuthButton, AuthField, AuthShell, authLinkClass } from "../components/AuthShell";

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { username, email: email || undefined, password },
      { onSuccess: () => navigate("/login", { replace: true }) }
    );
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Un minuto y ya puedes empezar a monitorear."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className={authLinkClass}>
            Inicia sesión
          </Link>
        </>
      }
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
          label="Email (opcional)"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <AuthField
          label="Contraseña"
          icon={Lock}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        {register.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formatApiError(register.error)}</p>
        )}
        <AuthButton type="submit" loading={register.isPending}>
          Crear cuenta
        </AuthButton>
      </form>
    </AuthShell>
  );
}
