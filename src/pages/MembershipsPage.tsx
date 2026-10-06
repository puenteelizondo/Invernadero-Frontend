import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import {
  useInviteMember,
  useMemberships,
  useRemoveMembership,
  useUpdateMembershipRole,
} from "../hooks/useGreenhouses";
import { formatApiError } from "../lib/api";
import type { Role } from "../types";
import { Layout } from "../components/Layout";
import { RoleBadge } from "../components/RoleBadge";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";

const ROLES: Role[] = ["viewer", "operator", "owner"];

export function MembershipsPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const { data: memberships, isLoading } = useMemberships(greenhouseId);
  const invite = useInviteMember(greenhouseId);
  const updateRole = useUpdateMembershipRole(greenhouseId);
  const remove = useRemoveMembership(greenhouseId);

  const [open, setOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [toRemove, setToRemove] = useState<number | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    invite.mutate(
      { invite: inviteValue, role },
      {
        onSuccess: () => {
          setOpen(false);
          setInviteValue("");
          setRole("viewer");
        },
      }
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={Users}
        title="Miembros"
        subtitle="Invita por username o email y define qué puede hacer cada persona."
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
                    onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value as Role })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Invitar miembro" icon={UserPlus}>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <Label>Username o email</Label>
            <Input value={inviteValue} onChange={(e) => setInviteValue(e.target.value)} autoFocus required />
          </div>
          <div className="mb-4">
            <Label>Rol</Label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <ErrorText>{invite.isError ? formatApiError(invite.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={invite.isPending}>
              <Plus className="h-4 w-4" /> Invitar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toRemove != null}
        title="Quitar acceso"
        message="Esta persona perderá el acceso a este invernadero."
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
