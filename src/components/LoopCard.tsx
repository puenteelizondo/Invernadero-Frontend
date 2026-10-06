import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, CircleAlert, Loader2, Pencil, RotateCcw, Send, Trash2, WifiOff } from "lucide-react";
import type { LoopPoint } from "../hooks/useRealtime";
import { useLoopHistory, useUpdateLoop } from "../hooks/useControl";
import { formatApiError } from "../lib/api";
import {
  DIRECTIONS, FIELDS_BY_MODE, MODES, PARAM_LABELS, PARAM_META, applyState, diffParams, fmtParam, paramsOf,
  type ParamKey,
} from "../lib/control";
import { EASE_LEAF, useCalm } from "../lib/motion";
import type { ControlLoop, ControlMode, ControlParams } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";
import { LoopChart } from "./LoopChart";
import { Segmented } from "./Segmented";
import { SliderField } from "./SliderField";
import { toast } from "./Toaster";
import { Button, ErrorText, Spinner } from "./ui";

function StatusPill({ loop, now }: { loop: ControlLoop; now: number }) {
  const s = applyState(loop, now);
  const cls =
    s.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : s.tone === "wait"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-neutral-300 bg-neutral-100 text-neutral-600";
  return (
    <span aria-live="polite" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {s.tone === "ok" ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.tone === "wait" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
      {s.text}
    </span>
  );
}

function History({ loop }: { loop: ControlLoop }) {
  const { data, isLoading } = useLoopHistory(loop.id, true);
  if (isLoading) return <Spinner />;
  if (!data?.length) return <p className="text-sm text-neutral-500">Sin cambios registrados.</p>;
  return (
    <ol className="space-y-2.5">
      {data.map((h) => {
        const entries = Object.entries(h.changes);
        return (
          <li key={h.id} className="rounded-xl border border-neutral-200 bg-surface p-3 text-sm">
            <p className="flex flex-wrap items-baseline gap-x-2 text-neutral-800">
              <span className="num rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-bold text-neutral-700">v{h.version}</span>
              <strong>{h.changed_by_name ?? "Sistema"}</strong>
              <span className="text-xs text-neutral-500">{new Date(h.created_at).toLocaleString("es-MX")}</span>
            </p>
            <ul className="mt-1.5 space-y-0.5 text-neutral-700">
              {entries.map(([k, v]) =>
                k === "created" ? (
                  <li key={k}>Lazo creado</li>
                ) : (
                  <li key={k} className="num">
                    {PARAM_LABELS[k] ?? k}: <span className="text-neutral-500">{fmtParam(k, (v as { before: unknown }).before, loop.unit)}</span>
                    {" → "}
                    <strong>{fmtParam(k, (v as { after: unknown }).after, loop.unit)}</strong>
                  </li>
                )
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Tarjeta de un lazo: gráfica en vivo, estado del dispositivo y panel de parámetros con BORRADOR
 * (Aplicar / Descartar). El cálculo del lazo lo hace el ESP32; aquí solo se edita la configuración.
 */
export function LoopCard({
  loop, points, canEdit, greenhouseId, now, onEdit, onDelete,
}: {
  loop: ControlLoop;
  points: LoopPoint[];
  canEdit: boolean;
  greenhouseId: number;
  now: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const calm = useCalm();
  const update = useUpdateLoop(greenhouseId);
  const server = useMemo(() => paramsOf(loop), [loop]);
  // Borrador: solo lo que el usuario cambió. Si el servidor cambia a otro valor, el borrador sigue encima.
  const [over, setOver] = useState<Partial<ControlParams>>({});
  const draft = { ...server, ...over } as ControlParams;
  const changes = diffParams(server, draft);
  const dirty = changes.length > 0;
  const [showHistory, setShowHistory] = useState(false);

  const set = <K extends ParamKey>(key: K, value: ControlParams[K]) =>
    setOver((o) => {
      const next = { ...o, [key]: value };
      if (server[key] === value) delete next[key];
      return next;
    });

  function setMode(mode: ControlMode) {
    setOver((o) => {
      const next: Partial<ControlParams> = { ...o, mode, enabled: mode !== "off" };
      if (server.mode === mode) delete next.mode;
      if (server.enabled === (mode !== "off")) delete next.enabled;
      return next;
    });
  }

  function apply() {
    const patch = Object.fromEntries(changes.map((c) => [c.key, c.after])) as Partial<ControlParams>;
    update.mutate({ id: loop.id, patch }, {
      onSuccess: () => {
        setOver({});
        // Guardar en el servidor NO es lo mismo que aplicarlo en el ESP32: eso solo lo
        // confirma el ack del dispositivo ("Aplicado por el ESP32" en la tarjeta).
        toast(
          loop.device_online
            ? "Guardado. Esperando a que el ESP32 lo confirme…"
            : "Guardado en el servidor. El ESP32 está sin conexión: lo aplicará al reconectarse."
        );
      },
    });
  }

  const tm = points[points.length - 1] ?? (loop.last_telemetry ? { t: 0, pv: loop.last_telemetry.pv, setpoint: loop.last_telemetry.setpoint, output: loop.last_telemetry.output } : null);
  const mode = draft.mode;
  const fields = FIELDS_BY_MODE[mode];
  const show = (k: ParamKey) => fields.includes(k);
  const changed = (k: ParamKey) => k in over && over[k] !== server[k];
  const meta = (k: ParamKey) => PARAM_META[k]!;
  const lo = loop.valid_min, hi = loop.valid_max;
  const spMin = lo ?? Math.min(draft.setpoint, server.setpoint) - 20;
  const spMax = hi ?? Math.max(draft.setpoint, server.setpoint) + 20;
  const modeHint = MODES.find((m) => m.value === mode)?.hint;
  const out = tm?.output ?? null;

  const num = (k: ParamKey, extra: Partial<React.ComponentProps<typeof SliderField>> = {}) => {
    const m = meta(k);
    return (
      <SliderField
        key={k}
        label={m.label}
        unit={m.unit}
        value={draft[k] as number}
        onChange={(v) => set(k, v as never)}
        min={m.min}
        max={m.max}
        sliderMax={k === "kp" ? Math.max(10, server.kp * 2) : k === "ki" ? Math.max(1, server.ki * 2) : k === "kd" ? Math.max(20, server.kd * 2) : k === "hysteresis" ? Math.max(5, server.hysteresis * 2) : k === "integral_limit" ? 100 : undefined}
        step={m.step}
        help={m.help}
        changed={changed(k)}
        disabled={!canEdit}
        {...extra}
      />
    );
  };

  return (
    <article aria-label={`Lazo ${loop.name}`} className="rounded-[1.5rem] border border-neutral-200/80 bg-surface p-4 shadow-pane sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold text-neutral-900">{loop.name}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">
            Mide <strong>{loop.sensor_name}</strong> · Maneja <strong>{loop.actuator_name}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill loop={loop} now={now} />
          {canEdit && (
            <>
              <button type="button" onClick={onEdit} aria-label={`Editar lazo ${loop.name}`} title="Editar lazo" className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={onDelete} aria-label={`Eliminar lazo ${loop.name}`} title="Eliminar lazo" className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* lectura en vivo */}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
        {[
          { l: "Medición", v: tm?.pv ?? null, u: loop.unit },
          { l: "Setpoint", v: server.setpoint, u: loop.unit },
          { l: "Salida", v: out, u: "%" },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-2 py-2.5">
            <dt className="text-xs font-medium text-neutral-500">{x.l}</dt>
            <dd className="font-display text-xl font-semibold text-neutral-900 sm:text-2xl">
              <AnimatedNumber value={x.v} maxDecimals={1} />
              {x.v != null && <span className="ml-0.5 text-xs font-medium text-neutral-500">{x.u}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {out != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-label="Salida del controlador" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(out)}>
          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700 ease-leaf" style={{ width: `${Math.min(100, Math.max(0, out))}%` }} />
        </div>
      )}

      <div className="mt-4">
        <LoopChart points={points} unit={loop.unit} />
      </div>

      {/* parámetros */}
      <div className="mt-5 space-y-3">
        <div>
          <p id={`mode-${loop.id}`} className="mb-1.5 text-sm font-semibold text-neutral-800">Modo de control</p>
          <Segmented label="Modo de control" value={mode} options={MODES.map((m) => ({ value: m.value, label: m.label }))} onChange={setMode} disabled={!canEdit} />
          {modeHint && <p className="mt-1.5 text-xs text-neutral-500">{modeHint}</p>}
        </div>

        {mode !== "off" && (
          <SliderField
            label="Setpoint"
            unit={loop.unit}
            value={draft.setpoint}
            onChange={(v) => set("setpoint", v)}
            min={lo ?? undefined}
            max={hi ?? undefined}
            sliderMin={spMin}
            sliderMax={spMax}
            step={Math.max(0.1, Math.round(((spMax - spMin) / 200) * 10) / 10)}
            help={lo != null && hi != null ? `El valor que el controlador intenta mantener. Rango válido del sensor: ${lo}–${hi} ${loop.unit}.` : "El valor que el controlador intenta mantener."}
            changed={changed("setpoint")}
            disabled={!canEdit}
          />
        )}

        {mode !== "off" && (
          <div className="grid gap-3 md:grid-cols-2">
            {(["kp", "ki", "kd", "hysteresis", "output_min", "output_max", "integral_limit", "sample_time_ms"] as ParamKey[]).filter(show).map((k) => num(k))}
          </div>
        )}

        {mode !== "off" && show("direction") && (
          <div>
            <p className="mb-1.5 text-sm font-semibold text-neutral-800">Dirección de la salida</p>
            <Segmented label="Dirección de la salida" value={draft.direction} options={DIRECTIONS.map((d) => ({ value: d.value, label: d.label }))} onChange={(v) => set("direction", v)} disabled={!canEdit} />
            <p className="mt-1.5 text-xs text-neutral-500">{DIRECTIONS.find((d) => d.value === draft.direction)?.hint}</p>
          </div>
        )}
      </div>

      {/* borrador pendiente */}
      <AnimatePresence initial={false}>
        {dirty && (
          <motion.div
            key="draft"
            initial={calm ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={calm ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE_LEAF }}
            className="overflow-hidden"
          >
            <div role="region" aria-label="Cambios pendientes" className="mt-4 rounded-2xl border border-brand-300 bg-brand-50/70 p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                <CircleAlert className="h-4 w-4" aria-hidden /> {changes.length === 1 ? "1 cambio sin aplicar" : `${changes.length} cambios sin aplicar`}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-800">
                {changes.map((c) => (
                  <li key={c.key} className="num flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-medium">{PARAM_LABELS[c.key] ?? c.key}:</span>
                    <span className="text-neutral-500 line-through decoration-neutral-400">{fmtParam(c.key, c.before, loop.unit)}</span>
                    <span aria-hidden>→</span>
                    <strong>{fmtParam(c.key, c.after, loop.unit)}</strong>
                  </li>
                ))}
              </ul>
              {update.isError && <div className="mt-2"><ErrorText>{formatApiError(update.error)}</ErrorText></div>}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => { setOver({}); update.reset(); }} disabled={update.isPending}>
                  <RotateCcw className="h-4 w-4" /> Descartar
                </Button>
                <Button onClick={apply} loading={update.isPending}>
                  <Send className="h-4 w-4" /> Aplicar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loop.device_online && (
        <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden /> El controlador está sin conexión. Los cambios se guardan y se aplicarán cuando se reconecte; mientras tanto sigue con la última configuración que recibió.
        </p>
      )}

      {/* historial */}
      <div className="mt-4 border-t border-neutral-200/70 pt-3">
        <button
          type="button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((s) => !s)}
          className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-1 text-sm font-semibold text-neutral-700 hover:text-brand-800"
        >
          <span>Historial de cambios <span className="num font-normal text-neutral-500">· v{loop.version}</span></span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {showHistory && <div className="mt-2"><History loop={loop} /></div>}
      </div>
    </article>
  );
}
