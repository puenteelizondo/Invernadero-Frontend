import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, KeyRound, Plus, Search, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { useMe } from "../hooks/useAuth";
import { useAdminUsers, useCreateUser, useResetUserPassword, useUpdateUser } from "../hooks/useAdminUsers";
import { formatApiError } from "../lib/api";
import type { AdminUser } from "../types";
import { CopyButton } from "../components/CopyButton";
import { toast } from "../components/Toaster";
import {
  Button, Card, ConfirmDialog, EmptyState, ErrorText, Field, FormActions, Hint, Input, Label, Modal, PageHeader, Spinner,
} from "../components/ui";

/** Muestra una contraseña temporal UNA sola vez, con botón de copiar. */
function TemporaryPasswordModal({
  info,
  onClose,
}: {
  info: { username: string; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal open={info != null} onClose={onClose} title="Contraseña temporal" icon={KeyRound}>
      {info && (
        <div>
          <p className="mb-3 text-sm text-neutral-700">
            Entrégasela a <strong>{info.username}</strong> por un canal seguro. <strong>No se volverá a mostrar</strong>;
            si se pierde, genera otra.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
            <code className="num select-all break-all text-base font-semibold tracking-wide text-brand-900">{info.password}</code>
            <CopyButton text={info.password} label="Copiar" />
          </div>
          <FormActions>
            <Button onClick={onClose}>Listo, ya la copié</Button>
          </FormActions>
        </div>
      )}
    </Modal>
  );
}

export function UsersPage() {
  const { data: me, isLoading: loadingMe } = useMe();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const isStaff = !!me?.is_staff;
  const { data, isLoading, isFetching } = useAdminUsers(debounced, page, isStaff);
  const create = useCreateUser();
  const update = useUpdateUser();
  const reset = useResetUserPassword();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", is_staff: false });
  const [temp, setTemp] = useState<{ username: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "deactivate" | "admin" | "reset"; user: AdminUser } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  if (loadingMe) return <Spinner />;
  if (!isStaff) return <Navigate to="/greenhouses" replace />;

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { username: form.username.trim(), email: form.email.trim() || undefined, password: form.password || undefined, is_staff: form.is_staff },
      {
        onSuccess: (u) => {
          setOpen(false);
          setForm({ username: "", email: "", password: "", is_staff: false });
          toast(`Usuario ${u.username} creado`);
          if (u.temporary_password) setTemp({ username: u.username, password: u.temporary_password });
        },
      }
    );
  }

  function runConfirm() {
    if (!confirm) return;
    const { kind, user } = confirm;
    const done = () => setConfirm(null);
    if (kind === "deactivate") {
      update.mutate({ id: user.id, is_active: !user.is_active }, {
        onSuccess: () => { toast(user.is_active ? "Usuario desactivado" : "Usuario reactivado"); done(); },
      });
    } else if (kind === "admin") {
      update.mutate({ id: user.id, is_staff: !user.is_staff }, {
        onSuccess: () => { toast(user.is_staff ? "Ya no es administrador" : "Ahora es administrador"); done(); },
      });
    } else {
      reset.mutate(user.id, {
        onSuccess: (r) => {
          done();
          if (r.temporary_password) setTemp({ username: r.username, password: r.temporary_password });
        },
      });
    }
  }

  const mutError = update.isError ? formatApiError(update.error) : reset.isError ? formatApiError(reset.error) : null;
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 20));

  const confirmCopy = confirm && {
    deactivate: confirm.user.is_active
      ? { title: "Desactivar usuario", msg: `${confirm.user.username} ya no podrá iniciar sesión. Su historial se conserva y puedes reactivarlo cuando quieras.`, label: "Desactivar", danger: true }
      : { title: "Reactivar usuario", msg: `${confirm.user.username} podrá volver a iniciar sesión.`, label: "Reactivar", danger: false },
    admin: confirm.user.is_staff
      ? { title: "Quitar rol de administrador", msg: `${confirm.user.username} dejará de poder crear usuarios y ver todos los invernaderos.`, label: "Quitar rol", danger: true }
      : { title: "Hacer administrador", msg: `${confirm.user.username} podrá crear usuarios y verá y operará todos los invernaderos.`, label: "Hacer administrador", danger: false },
    reset: { title: "Restablecer contraseña", msg: `Se generará una contraseña temporal para ${confirm.user.username} y la actual dejará de funcionar.`, label: "Generar contraseña", danger: false },
  }[confirm.kind];

  return (
    <>
      <PageHeader
        icon={UserCog}
        title="Usuarios"
        subtitle="Solo los administradores crean cuentas. Nadie puede registrarse por su cuenta."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
        <Input
          className="pl-10"
          type="search"
          placeholder="Buscar por usuario o email…"
          aria-label="Buscar usuarios"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!confirm && <ErrorText>{mutError}</ErrorText>}

      {isLoading ? (
        <Spinner />
      ) : !data?.results.length ? (
        <EmptyState title={debounced ? "Sin resultados" : "No hay usuarios"} hint={debounced ? "Prueba con otro nombre o email." : undefined} />
      ) : (
        <Card className={isFetching ? "opacity-80 transition-opacity" : "transition-opacity"}>
          <ul className="divide-y divide-neutral-200/70">
            {data.results.map((u) => {
              const self = u.id === me?.id;
              return (
                <li key={u.id} className="flex flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold uppercase shadow-sm ${
                        u.is_active ? "bg-brand-700 text-white dark:bg-brand-500 dark:text-neutral-50" : "bg-neutral-300 text-neutral-600"
                      }`}
                      aria-hidden
                    >
                      {u.username[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-neutral-900">
                        <span className="truncate">{u.username}</span>
                        {self && <span className="text-xs font-medium text-neutral-500">(tú)</span>}
                        {u.is_staff && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                            <ShieldCheck className="h-3 w-3" aria-hidden /> Administrador
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                            Desactivado
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {u.email || "Sin email"} · {u.last_login ? `Último acceso ${new Date(u.last_login).toLocaleString("es-MX")}` : "Nunca ha entrado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="!min-h-[36px] !px-3" onClick={() => setConfirm({ kind: "reset", user: u })}>
                      <KeyRound className="h-4 w-4" /> Contraseña
                    </Button>
                    <Button variant="secondary" className="!min-h-[36px] !px-3" disabled={self} title={self ? "No puedes cambiar tu propio rol" : undefined} onClick={() => setConfirm({ kind: "admin", user: u })}>
                      <ShieldCheck className="h-4 w-4" /> {u.is_staff ? "Quitar admin" : "Hacer admin"}
                    </Button>
                    <Button variant={u.is_active ? "ghost" : "secondary"} className="!min-h-[36px] !px-3" disabled={self} title={self ? "No puedes desactivarte a ti mismo" : undefined} onClick={() => setConfirm({ kind: "deactivate", user: u })}>
                      {u.is_active ? "Desactivar" : "Reactivar"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="Paginación" className="mt-3 flex items-center justify-between border-t border-neutral-200/70 pt-3 text-sm text-neutral-600">
              <span className="num">Página {page} de {totalPages} · {data.count} usuarios</span>
              <span className="flex gap-2">
                <Button variant="secondary" className="!min-h-[36px] !px-3" disabled={!data.previous} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" className="!min-h-[36px] !px-3" disabled={!data.next} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </span>
            </nav>
          )}
        </Card>
      )}

      <Modal open={open} onClose={() => { setOpen(false); create.reset(); }} title="Nuevo usuario" icon={UserPlus}>
        <form onSubmit={onCreate}>
          <Field>
            <Label>Usuario</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" autoFocus required />
          </Field>
          <Field>
            <Label>Email (opcional)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" />
            <Hint>Necesario si quieres que pueda recuperar su contraseña por correo.</Hint>
          </Field>
          <Field>
            <Label>Contraseña</Label>
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" placeholder="Vacío = generar una temporal" />
            <Hint>Si la dejas vacía se genera una temporal que verás una sola vez.</Hint>
          </Field>
          <label className="mb-1 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-neutral-800">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-neutral-300 accent-brand-600"
              checked={form.is_staff}
              onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
            />
            <span>
              <strong>Administrador</strong> <span className="text-neutral-500">· puede crear usuarios y ve todos los invernaderos</span>
            </span>
          </label>
          <ErrorText>{create.isError ? formatApiError(create.error) : null}</ErrorText>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); create.reset(); }}>Cancelar</Button>
            <Button type="submit" loading={create.isPending}>
              <Plus className="h-4 w-4" /> Crear usuario
            </Button>
          </FormActions>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm != null}
        title={confirmCopy?.title ?? ""}
        message={confirmCopy?.msg ?? ""}
        confirmLabel={confirmCopy?.label ?? "Confirmar"}
        danger={confirmCopy?.danger}
        loading={update.isPending || reset.isPending}
        error={mutError}
        onConfirm={runConfirm}
        onCancel={() => { update.reset(); reset.reset(); setConfirm(null); }}
      />

      <TemporaryPasswordModal info={temp} onClose={() => setTemp(null)} />
    </>
  );
}
