import { useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import {
  useCancelInvitation,
  useInviteMember,
  useMemberships,
  useSentInvitations,
  useRemoveMembership,
  useUpdateMembershipRole,
} from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Role } from "../types";
import { Layout } from "../components/Layout";
import { RoleBadge } from "../components/RoleBadge";
import { toast } from "../components/Toaster";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";

const ROLES: Role[] = ["viewer", "operator", "owner"];
const ROLE_LABEL: Record<Role, string> = { viewer: "Solo lectura", operator: "Operador", owner: "Propietario" };
const ROLE_HINT: Record<Role, string> = {
  viewer: "Puede ver todo, pero no cambiar nada.",
  operator: "Puede manejar actuadores y lazos de control.",
  owner: "Puede todo, incluso invitar y quitar miembros.",
};

export function MembershipsPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: memberships, isLoading } = useMemberships(greenhouseId);
  const invite = useInviteMember(greenhouseId);
  const updateRole = useUpdateMembershipRole(greenhouseId);
  const remove = useRemoveMembership(greenhouseId);
  const { data: pending } = useSentInvitations(greenhouseId);
  const cancel = useCancelInvitation(greenhouseId);

  const [open, setOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [toRemove, setToRemove] = useState<number | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    invite.mutate(
      { invite: inviteValue, role },
      {
        onSuccess: (inv) => {
          setOpen(false);
          setInviteValue("");
          setRole("viewer");
          toast(`Invitación enviada a ${inv.username}. Tendrá acceso cuando la acepte.`);
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={Users}
        title="Miembros"
        subtitle="Invita por username o email. La persona tiene acceso cuando acepta la invitación."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invitar
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !memberships?.length ? (
        <EmptyState title="Todavía no hay miembros" hint="Invita a alguien por su username o email." />
      ) : (
        <Card>
          <ul className="divide-y divide-brand-50">
            {memberships.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-sm font-semibold text-white dark:bg-brand-500 dark:text-neutral-50 uppercase shadow-sm">
                    {m.username[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{m.username}</p>
                    <p className="text-xs text-neutral-500">Desde {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full min-w-0 flex-1 sm:w-32 sm:flex-none">
                  <Select
                    className="!py-1.5"
                    value={m.role}
                    aria-label={`Rol de ${m.username}`}
                    onChange={(e) =>
                      updateRole.mutate(
                        { id: m.id, role: e.target.value as Role },
                        {
                          onSuccess: () => toast(`Rol de ${m.username} cambiado`),
                          onError: (err) => toast(formatApiError(err), "error"),
                        }
                      )
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                  </div>
                  <RoleBadge role={m.role} />
                  <button
                    onClick={() => setToRemove(m.id)}
                    className="rounded-lg p-2.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    title="Quitar acceso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!!pending?.length && (
        <Card className="mt-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden /> Invitaciones pendientes
          </h2>
          <p className="mb-2 text-xs text-neutral-500">Aún no tienen acceso: aparecerán arriba cuando acepten.</p>
          <ul className="divide-y divide-brand-50">
            {pending.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{inv.username}</p>
                  <p className="text-xs text-neutral-500">
                    Invitado {new Date(inv.created_at).toLocaleDateString("es-MX")}
                    {inv.invited_by_username ? ` por ${inv.invited_by_username}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={inv.role} />
                  <Button
                    variant="ghost"
                    className="!min-h-[36px] !px-3"
                    loading={cancel.isPending && cancel.variables === inv.id}
                    onClick={() =>
                      cancel.mutate(inv.id, {
                        onSuccess: () => toast("Invitación cancelada"),
                        onError: (err) => toast(formatApiError(err), "error"),
                      })
                    }
                  >
                    <X className="h-4 w-4" aria-hidden /> Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Invitar miembro" icon={UserPlus}>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <Label>Username o email</Label>
            <Input value={inviteValue} onChange={(e) => setInviteValue(e.target.value)} autoFocus required autoComplete="off" />
            <p className="mt-1.5 text-xs text-neutral-500">
              Debe tener una cuenta. Si tiene email, le llega un correo; también verá la invitación al entrar.
            </p>
          </div>
          <div className="mb-4">
            <Label>Rol</Label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-neutral-500">{ROLE_HINT[role]}</p>
          </div>
          <ErrorText>{invite.isError ? formatApiError(invite.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={invite.isPending}>
              <Send className="h-4 w-4" /> Enviar invitación
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toRemove != null}
        title="Quitar acceso"
        message="Esta persona perderá el acceso a este invernadero. Si tiene email, le llegará un aviso."
        confirmLabel="Quitar"
        danger
        loading={remove.isPending}
        error={remove.isError ? formatApiError(remove.error) : null}
        onConfirm={() => {
          if (toRemove != null) remove.mutate(toRemove, { onSuccess: () => setToRemove(null) });
        }}
        onCancel={() => {
          remove.reset();
          setToRemove(null);
        }}
      />
    </Layout>
  );
}
