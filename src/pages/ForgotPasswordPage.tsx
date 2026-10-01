import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, Mail } from "lucide-react";
import { useRequestPasswordReset } from "../hooks/useAuth";
import { AuthButton, AuthField, AuthShell, authLinkClass } from "../components/AuthShell";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const request = useRequestPasswordReset();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    request.mutate({ email });
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te mandamos un enlace para elegir una nueva."
      footer={
        <Link to="/login" className={authLinkClass}>
          Volver a iniciar sesión
        </Link>
      }
    >
      {request.isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <MailCheck className="h-7 w-7 text-brand-700" />
          </span>
          <p className="text-sm text-neutral-600">
            Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña. Revisa tu
            bandeja de entrada.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <AuthField
            label="Email de tu cuenta"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
          <AuthButton type="submit" loading={request.isPending}>
            Enviar enlace
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
