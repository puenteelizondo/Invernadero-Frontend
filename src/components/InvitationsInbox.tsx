import { useNavigate } from "react-router-dom";
import { Check, MailOpen, X } from "lucide-react";
import { useAnswerInvitation, useMyInvitations } from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import { RoleBadge } from "./RoleBadge";
import { toast } from "./Toaster";
import { Button } from "./ui";

/**
 * Invitaciones pendientes a invernaderos, arriba de cualquier página.
 * Hasta que la persona acepta, no tiene acceso a ese invernadero.
 */
export function InvitationsInbox() {
  const { data } = useMyInvitations();
  const answer = useAnswerInvitation();
  const navigate = useNavigate();
  if (!data?.length) return null;

  return (
    <section aria-label="Invitaciones pendientes" className="mb-5 space-y-2">
      {data.map((inv) => {
        const busy = answer.isPending && answer.variables?.id === inv.id;
        return (
          <div
            key={inv.id}
            className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white dark:bg-brand-500">
                <MailOpen className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 text-sm text-neutral-800">
                <p>
                  <strong>{inv.invited_by_username ?? "Alguien"}</strong> te invitó al invernadero{" "}
                  <strong className="break-words">{inv.greenhouse_name}</strong>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                  como <RoleBadge role={inv.role} />
                  <span>· {new Date(inv.created_at).toLocaleDateString("es-MX")}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                className="!min-h-[38px] flex-1 !px-3 sm:flex-none"
                disabled={answer.isPending}
                onClick={() =>
                  answer.mutate(
                    { id: inv.id, accept: false },
                    {
                      onSuccess: () => toast("Invitación rechazada"),
                      onError: (e) => toast(formatApiError(e), "error"),
                    }
                  )
                }
              >
                <X className="h-4 w-4" aria-hidden /> Rechazar
              </Button>
              <Button
                className="!min-h-[38px] flex-1 !px-3 sm:flex-none"
                loading={busy && answer.variables?.accept}
                disabled={answer.isPending}
                onClick={() =>
                  answer.mutate(
                    { id: inv.id, accept: true },
                    {
                      onSuccess: () => {
                        toast(`Ya tienes acceso a ${inv.greenhouse_name}`);
                        navigate(`/greenhouses/${inv.greenhouse}`);
                      },
                      onError: (e) => toast(formatApiError(e), "error"),
                    }
                  )
                }
              >
                <Check className="h-4 w-4" aria-hidden /> Aceptar
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
