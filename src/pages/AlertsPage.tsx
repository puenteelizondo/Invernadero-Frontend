import { AnimatePresence, motion } from "framer-motion";
import { HealthyPlantIllustration } from "../components/Illustrations";
import { spring } from "../lib/motion";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, Bell, BellRing, CheckCheck, Eraser, Mail, Pencil, Plus, ShieldAlert, Trash2, WifiOff } from "lucide-react";
import {
  useAcknowledgeAlert,
  useAlertRules,
  useAlerts,
  useCreateAlertRule,
  useDeleteAlertRule,
  usePurgeAlerts,
  useUpdateAlertRule,
  type AlertRuleFormValues,
} from "../hooks/useAlerts";
import { useCanManageGreenhouse, useMemberships, useSensors } from "../hooks/useGreenhouses";
import { useMe } from "../hooks/useAuth";
import { formatApiError } from "../lib/api";
import type { Alert, AlertRule, AlertRuleType, AlertSeverity } from "../types";
import { Layout } from "../components/Layout";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorText,
  Field,
  FormActions,
  Hint,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from "../components/ui";

type Tab = "active" | "history" | "rules";

/** 90 -> "1 min 30 s"; 0 -> "al instante". */
export function fmtDuration(sec: number): string {
  if (sec <= 0) return "al instante";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h && `${h} h`, m && `${m} min`, s && `${s} s`].filter(Boolean).join(" ");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });
}

function limitsText(r: { min_value: number | null; max_value: number | null; unit: string }) {
  const u = r.unit ? ` ${r.unit}` : "";
  const parts = [];
  if (r.min_value != null) parts.push(`menor que ${r.min_value}${u}`);
  if (r.max_value != null) parts.push(`mayor que ${r.max_value}${u}`);
  return parts.join(" o ");
}

const SEV: Record<AlertSeverity, { label: string; chip: string; bar: string }> = {
  critical: { label: "Crítica", chip: "bg-red-100 text-red-700", bar: "border-l-red-500" },
  warning: { label: "Aviso", chip: "bg-amber-100 text-amber-700", bar: "border-l-amber-400" },
};

interface Draft {
  id?: number;
  sensor: string;
  name: string;
  rule_type: AlertRuleType;
  min_value: string;
  max_value: string;
  duration_seconds: string;
  severity: AlertSeverity;
  is_active: boolean;
  notify_email: boolean;
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function AlertsPage() {
  const { id } = useParams();
  const greenhouseId = Number(id);
  const [params, setParams] = useSearchParams();
  const { data: me } = useMe();
  const { data: memberships } = useMemberships(greenhouseId);
  const canManage = useCanManageGreenhouse(greenhouseId);
  const myRole = memberships?.find((m) => m.user === me?.id)?.role;
  const canAck = !!me?.is_staff || myRole === "owner" || myRole === "operator";

  const [tab, setTab] = useState<Tab>("active");
  const [page, setPage] = useState(1);
  const { data: active, isLoading: activeLoading } = useAlerts(greenhouseId, "active");
  const { data: history, isLoading: histLoading } = useAlerts(greenhouseId, "resolved", page);
  const { data: rules, isLoading: rulesLoading } = useAlertRules(greenhouseId);
  const { data: sensors } = useSensors(greenhouseId);

  const ack = useAcknowledgeAlert(greenhouseId);
  const create = useCreateAlertRule(greenhouseId);
  const update = useUpdateAlertRule(greenhouseId);
  const remove = useDeleteAlertRule(greenhouseId);
  const purge = usePurgeAlerts(greenhouseId);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState("30"); // "" = todas las resueltas

  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<AlertRule | null>(null);
  const save = draft?.id != null ? update : create;

  const sensorUnit = useMemo(() => new Map((sensors ?? []).map((s) => [s.id, s.effective_unit])), [sensors]);

  function openNew(sensorId?: number) {
    save.reset();
    setDraft({
      sensor: sensorId ? String(sensorId) : sensors?.[0] ? String(sensors[0].id) : "",
      name: "", rule_type: "threshold", min_value: "", max_value: "", duration_seconds: "0",
      severity: "warning", is_active: true, notify_email: true,
    });
  }

  // Llegar desde la campana de un sensor: /alerts?sensor=ID abre «Nueva regla» con ese sensor.
  const sensorParam = params.get("sensor");
  useEffect(() => {
    if (sensorParam && sensors && canManage) {
      setTab("rules");
      openNew(Number(sensorParam));
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorParam, sensors, canManage]);

  function openEdit(r: AlertRule) {
    update.reset();
    setDraft({
      id: r.id, sensor: String(r.sensor), name: r.name, rule_type: r.rule_type,
      min_value: r.min_value != null ? String(r.min_value) : "",
      max_value: r.max_value != null ? String(r.max_value) : "",
      duration_seconds: String(r.duration_seconds), severity: r.severity,
      is_active: r.is_active, notify_email: r.notify_email,
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const values: AlertRuleFormValues = {
      sensor: Number(draft.sensor), name: draft.name.trim(), rule_type: draft.rule_type,
      min_value: draft.rule_type === "threshold" ? num(draft.min_value) : null,
      max_value: draft.rule_type === "threshold" ? num(draft.max_value) : null,
      duration_seconds: Math.max(0, Math.round(Number(draft.duration_seconds) || 0)),
      severity: draft.severity, is_active: draft.is_active, notify_email: draft.notify_email,
    };
    (save.mutate as (v: unknown, o: { onSuccess: () => void }) => void)(
      draft.id != null ? { id: draft.id, ...values } : values,
      { onSuccess: () => setDraft(null) }
    );
  }

  const activeCount = active?.count ?? 0;
  const tabs: [Tab, string, number | null][] = [
    ["active", "Activas", activeCount],
    ["history", "Historial", null],
    ["rules", "Reglas", rules?.length ?? null],
  ];

  function AlertCard({ a }: { a: Alert }) {
    const sev = SEV[a.severity];
    const u = a.unit ? ` ${a.unit}` : "";
    const isActive = a.status === "active";
    return (
      <Card className={`border-l-4 ${isActive ? sev.bar : "border-l-emerald-300"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.chip}`}>
                <AlertTriangle className="h-3 w-3" /> {sev.label}
              </span>
              <p className="font-semibold text-neutral-900">{a.sensor_name}</p>
              {!isActive && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Resuelta</span>}
            </div>
            <p className="mt-1 text-sm text-neutral-700">
              {a.kind === "stale" ? (
                <>
                  <WifiOff className="mr-1 inline h-4 w-4 text-neutral-500" />
                  Sin datos {isActive ? "desde hace" : "durante"} <b>{fmtDuration(a.peak_value)}</b> (se toleran {fmtDuration(a.threshold)}).
                </>
              ) : (
                <>
                  {a.kind === "high" ? "Superó el máximo" : "Bajó del mínimo"} de {a.threshold}{u}. Valor más extremo:{" "}
                  <b>{a.peak_value}{u}</b>
                </>
              )}
              {a.rule_name && <span className="text-neutral-500"> · {a.rule_name}</span>}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Desde {fmtDate(a.opened_at)}
              {a.resolved_at && ` hasta ${fmtDate(a.resolved_at)}`}
              {a.acknowledged_by_name && ` · Reconocida por ${a.acknowledged_by_name}`}
            </p>
          </div>
          {isActive && canAck && !a.acknowledged_at && (
            <Button variant="secondary" loading={ack.isPending && ack.variables === a.id} onClick={() => ack.mutate(a.id)}>
              <CheckCheck className="h-4 w-4" /> Reconocer
            </Button>
          )}
          {isActive && a.acknowledged_at && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCheck className="h-4 w-4" /> Reconocida
            </span>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Layout>
      <PageHeader
        icon={BellRing}
        title="Alertas"
        subtitle="Avisos cuando un sensor sale de los límites que definas. Se cierran solas cuando el valor vuelve a la normalidad."
        actions={
          canManage && (
            <Button onClick={() => { setTab("rules"); openNew(); }}>
              <Plus className="h-4 w-4" /> Nueva regla
            </Button>
          )
        }
      />

      <div className="mb-5 inline-flex rounded-xl border border-brand-100 bg-surface p-1 shadow-sm">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative inline-flex min-h-[38px] items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === key ? "text-white dark:text-neutral-50" : "text-neutral-600 hover:bg-brand-50 hover:text-neutral-900"
            }`}
            aria-pressed={tab === key}
          >
            {tab === key && (
              <motion.span
                layoutId="alerts-tab"
                className="absolute inset-0 rounded-lg bg-brand-700 shadow-sm dark:bg-brand-500"
                transition={spring}
              />
            )}
            <span className="relative">{label}</span>
            {count != null && (
              <span
                className={`relative rounded-full px-1.5 text-[11px] ${
                  tab === key ? "bg-white/25" : key === "active" && count > 0 ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-700"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <ErrorText>{ack.isError ? formatApiError(ack.error) : null}</ErrorText>

      {tab === "active" &&
        (activeLoading ? (
          <Spinner />
        ) : !active?.results.length ? (
          <div className="flex flex-col items-center rounded-[1.25rem] border border-emerald-200 bg-emerald-50/60 px-6 py-10 text-center">
            <HealthyPlantIllustration className="mb-2 h-24 w-28" />
            <p className="font-display text-lg font-semibold text-neutral-900">Sin alertas activas</p>
            <p className="mt-1 max-w-md text-sm text-neutral-600">Todo está dentro de los límites. Crea reglas en la pestaña «Reglas» para que te avisemos si algo cambia.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {active.results.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  transition={spring}
                >
                  <AlertCard a={a} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ))}

      {tab === "history" && canManage && (
        <div className="mb-3 flex justify-end">
          <Button variant="secondary" onClick={() => { purge.reset(); setPurgeOpen(true); }}>
            <Eraser className="h-4 w-4" /> Limpiar historial
          </Button>
        </div>
      )}

      {tab === "history" &&
        (histLoading ? (
          <Spinner />
        ) : !history?.results.length ? (
          <EmptyState title="Todavía no hay historial" hint="Aquí aparecerán las alertas que ya se resolvieron." />
        ) : (
          <>
            <div className="space-y-3">{history.results.map((a) => <AlertCard key={a.id} a={a} />)}</div>
            {/* El backend pagina de 20 en 20: los botones solo aparecen si hay más de una página. */}
            {(history.next || page > 1) ? (
              <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span>Página {page} · {history.count} alertas</span>
                <Button variant="secondary" disabled={!history.next} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-neutral-500">{history.count} {history.count === 1 ? "alerta" : "alertas"} en el historial</p>
            )}
          </>
        ))}

      {tab === "rules" &&
        (rulesLoading ? (
          <Spinner />
        ) : !rules?.length ? (
          <EmptyState
            title="Todavía no hay reglas"
            hint={canManage ? "Crea una con «Nueva regla»: elige un sensor y el límite que quieres vigilar." : "Solo el propietario puede crear reglas."}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rules.map((r) => (
              <Card key={r.id} className="relative">
                {canManage && (
                  <div className="absolute right-3 top-3 flex gap-1">
                    <button onClick={() => openEdit(r)} className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-brand-50 hover:text-brand-700" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { remove.reset(); setToDelete(r); }}
                      className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-red-50 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 pr-16">
                  {r.rule_type === "no_signal" ? (
                    <WifiOff className={`h-4 w-4 ${r.is_active ? "text-brand-600" : "text-neutral-300"}`} />
                  ) : (
                    <Bell className={`h-4 w-4 ${r.is_active ? "text-brand-600" : "text-neutral-300"}`} />
                  )}
                  <p className="truncate font-semibold text-neutral-900">{r.name || r.sensor_name}</p>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  {r.rule_type === "no_signal" ? (
                    <>
                      <b>{r.sensor_name}</b>: avisa si no manda datos durante {fmtDuration(r.duration_seconds)}.
                    </>
                  ) : (
                    <>
                      <b>{r.sensor_name}</b>: avisa si es {limitsText(r)}
                      {r.duration_seconds > 0 ? ` durante ${fmtDuration(r.duration_seconds)}` : ""}.
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className={`rounded-full px-2.5 py-0.5 font-medium ${SEV[r.severity].chip}`}>{SEV[r.severity].label}</span>
                  {r.notify_email && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
                      <Mail className="h-3 w-3" /> Correo
                    </span>
                  )}
                  {!r.is_active && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-500">Desactivada</span>}
                  {r.has_active_alert && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700">
                      <ShieldAlert className="h-3 w-3" /> Alerta activa
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}

      <Modal
        open={draft != null}
        onClose={() => setDraft(null)}
        title={draft?.id != null ? "Editar regla de alerta" : "Nueva regla de alerta"}
        icon={BellRing}
      >
        {draft && (
          <form onSubmit={onSubmit}>
            <Field>
              <Label>Sensor</Label>
              <Select
                value={draft.sensor}
                onChange={(e) => setDraft({ ...draft, sensor: e.target.value })}
                disabled={draft.id != null}
                required
              >
                {sensors?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.effective_unit || "—"})</option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>¿Qué vigilar?</Label>
              <Select
                value={draft.rule_type}
                onChange={(e) => {
                  const rule_type = e.target.value as AlertRuleType;
                  // Al cambiar a «sin señal» se propone 5 min (300 s) si no había una duración.
                  setDraft({ ...draft, rule_type, duration_seconds: rule_type === "no_signal" && Number(draft.duration_seconds) < 30 ? "300" : draft.duration_seconds });
                }}
                disabled={draft.id != null}
              >
                <option value="threshold">Que el valor salga de unos límites</option>
                <option value="no_signal">Que el sensor deje de mandar datos</option>
              </Select>
            </Field>
            {draft.rule_type === "threshold" ? (
            <>
            <div className="grid grid-cols-2 gap-x-3">
              <Field>
                <Label>Avisar si baja de</Label>
                <Input type="number" step="any" value={draft.min_value} placeholder="mínimo"
                  onChange={(e) => setDraft({ ...draft, min_value: e.target.value })} />
              </Field>
              <Field>
                <Label>Avisar si supera</Label>
                <Input type="number" step="any" value={draft.max_value} placeholder="máximo"
                  onChange={(e) => setDraft({ ...draft, max_value: e.target.value })} />
              </Field>
            </div>
            <Hint>
              Pon uno o los dos límites{sensorUnit.get(Number(draft.sensor)) ? ` (en ${sensorUnit.get(Number(draft.sensor))})` : ""}. Déjalo vacío el que no uses.
            </Hint>
            <div className="mt-4 grid grid-cols-2 gap-x-3">
              <Field>
                <Label>Debe durar (segundos)</Label>
                <Input type="number" min={0} step={1} value={draft.duration_seconds}
                  onChange={(e) => setDraft({ ...draft, duration_seconds: e.target.value })} />
              </Field>
              <Field>
                <Label>Severidad</Label>
                <Select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as AlertSeverity })}>
                  <option value="warning">Aviso</option>
                  <option value="critical">Crítica</option>
                </Select>
              </Field>
            </div>
            <Hint>
              {Number(draft.duration_seconds) > 0
                ? `Para evitar falsas alarmas, el valor debe quedarse fuera de los límites ${fmtDuration(Number(draft.duration_seconds))} antes de abrir la alerta.`
                : "La alerta se abre en cuanto llegue un valor fuera de los límites. Sube la duración para ignorar picos breves."}
            </Hint>
            </>
            ) : (
            <>
            <div className="grid grid-cols-2 gap-x-3">
              <Field>
                <Label>Avisar tras (segundos sin datos)</Label>
                <Input type="number" min={30} step={1} value={draft.duration_seconds} required
                  onChange={(e) => setDraft({ ...draft, duration_seconds: e.target.value })} />
              </Field>
              <Field>
                <Label>Severidad</Label>
                <Select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as AlertSeverity })}>
                  <option value="warning">Aviso</option>
                  <option value="critical">Crítica</option>
                </Select>
              </Field>
            </div>
            <Hint>
              Se avisa cuando el sensor lleva más de {fmtDuration(Number(draft.duration_seconds) || 0)} sin mandar lecturas (mínimo 30 s) y se cierra sola cuando vuelve a reportar. Pon un valor mayor al intervalo con el que envía tu dispositivo.
            </Hint>
            </>
            )}
            <div className="mt-4">
              <Field>
                <Label>Nombre (opcional)</Label>
                <Input value={draft.name} maxLength={100} placeholder="Ej. Calor en invernadero"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={draft.notify_email} onChange={(e) => setDraft({ ...draft, notify_email: e.target.checked })} />
              Enviar correo a los propietarios al abrirse la alerta
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
              Regla activa
            </label>
            <ErrorText>{save.isError ? formatApiError(save.error) : null}</ErrorText>
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => setDraft(null)}>Cancelar</Button>
              <Button type="submit" loading={save.isPending}>{draft.id != null ? "Guardar cambios" : "Crear regla"}</Button>
            </FormActions>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={purgeOpen}
        title="Limpiar el historial de alertas"
        message="Se borrarán las alertas que ya se resolvieron. Las alertas activas no se tocan. Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        danger
        loading={purge.isPending}
        error={purge.isError ? formatApiError(purge.error) : null}
        body={
          <div className="mt-4">
            <Label>¿Qué borrar?</Label>
            <Select value={purgeDays} onChange={(e) => setPurgeDays(e.target.value)}>
              <option value="7">Resueltas hace más de 7 días</option>
              <option value="30">Resueltas hace más de 30 días</option>
              <option value="90">Resueltas hace más de 90 días</option>
              <option value="">Todas las resueltas</option>
            </Select>
            {purge.isSuccess && (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                Listo: {purge.data.deleted} {purge.data.deleted === 1 ? "alerta borrada" : "alertas borradas"}.
              </p>
            )}
            <Hint>Además, el sistema borra solo las resueltas con más de 90 días (lo configura el servidor).</Hint>
          </div>
        }
        onConfirm={() => purge.mutate(purgeDays === "" ? null : Number(purgeDays), { onSuccess: () => setPage(1) })}
        onCancel={() => { purge.reset(); setPurgeOpen(false); }}
      />

      <ConfirmDialog
        open={toDelete != null}
        title={`Eliminar la regla «${toDelete?.name || toDelete?.sensor_name || ""}»`}
        message="Se dejará de vigilar ese límite. Las alertas que ya ocurrieron se conservan en el historial."
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        error={remove.isError ? formatApiError(remove.error) : null}
        onConfirm={() => { if (toDelete) remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) }); }}
        onCancel={() => { remove.reset(); setToDelete(null); }}
      />
    </Layout>
  );
}
