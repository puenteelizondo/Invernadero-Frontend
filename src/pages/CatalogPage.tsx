import { motion } from "framer-motion";
import { spring } from "../lib/motion";
import { useState } from "react";
import { BookMarked, Cpu, Globe, Home, Pencil, Plus, ToggleLeft, Trash2 } from "lucide-react";
import {
  useActuatorTypes,
  useCreateActuatorType,
  useCreateSensorType,
  useDeleteActuatorType,
  useDeleteSensorType,
  useGreenhouses,
  useSensorTypes,
  useUpdateActuatorType,
  useUpdateSensorType,
} from "../hooks/useGreenhouses";
import { useMe } from "../hooks/useAuth";
import { findActuatorPreset } from "../lib/actuatorPresets";
import { findSensorPreset } from "../lib/sensorPresets";
import { formatApiError } from "../lib/api";
import type { ActuatorType, SensorType } from "../types";
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
  Spinner,
} from "../components/ui";

type Tab = "sensors" | "actuators";

interface Draft {
  id?: number;
  greenhouse: string; // "" = global (solo staff)
  code: string;
  name: string;
  description: string;
  default_unit: string;
  valid_min: string;
  valid_max: string;
}

const EMPTY: Draft = { greenhouse: "", code: "", name: "", description: "", default_unit: "", valid_min: "", valid_max: "" };

function toNum(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

/**
 * Catálogo de tipos de sensor y de actuador. Hay dos alcances: los GLOBALES
 * (los gestiona el staff y los ven todos) y los PROPIOS de un invernadero
 * (los crea su propietario y solo los ven los miembros de ese invernadero).
 * Cada tarjeta trae `can_edit` del backend para saber si se puede modificar.
 */
export function CatalogPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: greenhouses } = useGreenhouses();
  const ghName = (id: number | null) => greenhouses?.find((g) => g.id === id)?.name ?? `Invernadero #${id}`;
  const [tab, setTab] = useState<Tab>("sensors");
  const { data: sensorTypes, isLoading: stLoading } = useSensorTypes();
  const { data: actuatorTypes, isLoading: atLoading } = useActuatorTypes();
  const createSensorType = useCreateSensorType();
  const updateSensorType = useUpdateSensorType();
  const deleteSensorType = useDeleteSensorType();
  const createActuatorType = useCreateActuatorType();
  const updateActuatorType = useUpdateActuatorType();
  const deleteActuatorType = useDeleteActuatorType();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<{ id: number; name: string } | null>(null);

  const isSensors = tab === "sensors";
  const save = isSensors
    ? draft?.id != null ? updateSensorType : createSensorType
    : draft?.id != null ? updateActuatorType : createActuatorType;
  const remove = isSensors ? deleteSensorType : deleteActuatorType;

  if (meLoading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  function openNew() {
    save.reset();
    setDraft({ ...EMPTY, greenhouse: me?.is_staff ? "" : String(greenhouses?.[0]?.id ?? "") });
  }

  function openEdit(t: SensorType | ActuatorType) {
    save.reset();
    const s = t as SensorType;
    setDraft({
      id: t.id,
      greenhouse: t.greenhouse != null ? String(t.greenhouse) : "",
      code: t.code,
      name: t.name,
      description: t.description,
      default_unit: isSensors ? s.default_unit : "",
      valid_min: isSensors && s.valid_min != null ? String(s.valid_min) : "",
      valid_max: isSensors && s.valid_max != null ? String(s.valid_max) : "",
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const base = { code: draft.code.trim(), name: draft.name.trim(), description: draft.description };
    const scope = draft.id != null ? {} : { greenhouse: draft.greenhouse === "" ? null : Number(draft.greenhouse) };
    const payload = isSensors
      ? { ...base, ...scope, default_unit: draft.default_unit.trim(), valid_min: toNum(draft.valid_min), valid_max: toNum(draft.valid_max) }
      : { ...base, ...scope };
    (save.mutate as (v: unknown, o: { onSuccess: () => void }) => void)(
      draft.id != null ? { id: draft.id, ...payload } : payload,
      { onSuccess: () => setDraft(null) }
    );
  }

  const loading = isSensors ? stLoading : atLoading;
  const items: (SensorType | ActuatorType)[] = (isSensors ? sensorTypes : actuatorTypes) ?? [];

  return (
    <Layout>
      <PageHeader
        icon={BookMarked}
        title="Catálogo de tipos"
        subtitle="Tipos globales (para todos) y tipos propios de tus invernaderos."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuevo tipo
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-xl border border-brand-100 bg-surface p-1 shadow-sm">
        {(
          [
            ["sensors", "Sensores", Cpu],
            ["actuators", "Actuadores", ToggleLeft],
          ] as const
        ).map(([key, label, Icon]) => (
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
                layoutId="catalog-tab"
                className="absolute inset-0 rounded-lg bg-brand-700 shadow-sm dark:bg-brand-500"
                transition={spring}
              />
            )}
            <Icon className="relative h-4 w-4" /> <span className="relative">{label}</span>
            <span className={`relative rounded-full px-1.5 text-[11px] ${tab === key ? "bg-white/25" : "bg-brand-50 text-brand-700"}`}>
              {key === "sensors" ? sensorTypes?.length ?? 0 : actuatorTypes?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : !items.length ? (
        <EmptyState title="Todavía no hay tipos" hint="Crea el primero con «Nuevo tipo»." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            const preset = isSensors ? findSensorPreset(t.code, t.name) : findActuatorPreset(t.code, t.name);
            const Icon = preset?.icon;
            const st = t as SensorType;
            return (
              <Card key={t.id} className="relative">
                {t.can_edit && (<div className="absolute right-3 top-3 flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-brand-50 hover:text-brand-700"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      remove.reset();
                      setToDelete({ id: t.id, name: t.name });
                    }}
                    className="rounded-lg p-2 text-neutral-500 sm:p-1 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>)}
                <div className="mb-2 flex items-center gap-3 pr-16">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: `${preset?.hex ?? "#94a3b8"}22` }}
                  >
                    {Icon ? <Icon className="h-5 w-5" style={{ color: preset?.hex }} /> : <BookMarked className="h-5 w-5 text-neutral-500" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{t.name}</p>
                    <p className="break-all font-mono text-xs text-neutral-500">{t.code}</p>
                  </div>
                </div>
                <span className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.greenhouse == null ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
                  {t.greenhouse == null ? <Globe className="h-3 w-3" /> : <Home className="h-3 w-3" />}
                  {t.greenhouse == null ? "Global" : ghName(t.greenhouse)}
                </span>
                {t.description && <p className="mb-2 line-clamp-2 text-sm text-neutral-500">{t.description}</p>}
                {isSensors && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
                      Unidad: {st.default_unit || "—"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-600">
                      Rango: {st.valid_min ?? "—"} a {st.valid_max ?? "—"}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={draft != null}
        onClose={() => setDraft(null)}
        title={`${draft?.id != null ? "Editar" : "Nuevo"} tipo de ${isSensors ? "sensor" : "actuador"}`}
        icon={BookMarked}
      >
        {draft && (
          <form onSubmit={onSubmit}>
            <Field>
              <Label>Alcance</Label>
              <select
                className="w-full rounded-xl border border-brand-100 bg-surface px-3 py-2 text-sm disabled:bg-neutral-50"
                value={draft.greenhouse}
                disabled={draft.id != null}
                onChange={(e) => setDraft({ ...draft, greenhouse: e.target.value })}
              >
                {me?.is_staff && <option value="">Global (todos los invernaderos)</option>}
                {greenhouses?.map((g) => (
                  <option key={g.id} value={g.id}>Solo en {g.name}</option>
                ))}
              </select>
              <Hint>
                {draft.id != null
                  ? "El alcance no se puede cambiar después de crearlo."
                  : "Un tipo propio solo lo ven los miembros de ese invernadero; hay que ser su propietario."}
              </Hint>
            </Field>
            <Field>
              <Label>Nombre</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus />
            </Field>
            <Field>
              <Label>Código</Label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                pattern="[-a-zA-Z0-9_]+"
                title="Solo letras, números, guion y guion bajo"
                placeholder={isSensors ? "temperature" : "fan"}
                required
              />
              <Hint>
                Único, sin espacios. El panel elige el ícono y la animación a partir del código
                {draft.id != null ? ", así que cambiarlo puede cambiar cómo se ve." : "."}
              </Hint>
            </Field>
            {isSensors && (
              <>
                <Field>
                  <Label>Unidad por defecto</Label>
                  <Input
                    value={draft.default_unit}
                    onChange={(e) => setDraft({ ...draft, default_unit: e.target.value })}
                    maxLength={20}
                    placeholder="°C, %, ppm"
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-x-3">
                  <Field>
                    <Label>Mínimo válido</Label>
                    <Input type="number" step="any" value={draft.valid_min} onChange={(e) => setDraft({ ...draft, valid_min: e.target.value })} />
                  </Field>
                  <Field>
                    <Label>Máximo válido</Label>
                    <Input type="number" step="any" value={draft.valid_max} onChange={(e) => setDraft({ ...draft, valid_max: e.target.value })} />
                  </Field>
                </div>
                <Hint>Las lecturas fuera de este rango se rechazan. Déjalo vacío si no aplica.</Hint>
              </>
            )}
            <div className="mt-4">
              <Field>
                <Label>Descripción</Label>
                <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
            </div>
            <ErrorText>{save.isError ? formatApiError(save.error) : null}</ErrorText>
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={save.isPending}>
                {draft.id != null ? "Guardar cambios" : "Crear tipo"}
              </Button>
            </FormActions>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete != null}
        title={`Eliminar «${toDelete?.name ?? ""}»`}
        message="Se eliminará el tipo del catálogo. Si todavía hay sensores o actuadores de este tipo, no se podrá eliminar."
        confirmLabel="Eliminar"
        danger
        loading={remove.isPending}
        error={remove.isError ? formatApiError(remove.error) : null}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
        onCancel={() => {
          remove.reset();
          setToDelete(null);
        }}
      />
    </Layout>
  );
}
