import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMe } from "../hooks/useAuth";
import { SproutIllustration } from "./Illustrations";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div role="status" aria-label="Cargando" className="flex h-dvh flex-col items-center justify-center gap-2 bg-canvas">
        <SproutIllustration className="h-20 w-20" />
        <p className="text-sm text-neutral-500">Abriendo el invernadero…</p>
      </div>
    );
  }

  if (isError || !me) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
