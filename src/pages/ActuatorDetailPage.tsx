import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, History, Hand, Pencil } from "lucide-react";
import {
  useActuator,
  useActuatorHistory,
  useActuatorTypeCodeMap,
  useSetActuatorState,
} from "../hooks/useGreenhouses";
import { useRealtime } from "../hooks/useRealtime";
import { formatApiError } from "../lib/api";
import { findActuatorPreset } from "../lib/actuatorPresets";
import { Layout } from "../components/Layout";
import { ActuatorGauge } from "../components/ActuatorGauge";
import { ActuatorConnectPanel } from "../components/ActuatorConnectPanel";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { EditActuatorModal } from "../components/EditActuatorModal";
import { Button, Card, EmptyState, ErrorText, PageHeader, Spinner } from "../components/ui";

/**
 * Detalle de un actuador: su ilustración viva, el interruptor para
 * encenderlo/apagarlo a mano (POST /actuators/{id}/state/, solo Owner u
 * Operator), la tarjeta para conectar el hardware y el historial de
 * cambios de estado (GET /actuators/{id}/history/).
 */
export function ActuatorDetailPage() {
  const { id, actuatorId } = useParams();
  const greenhouseId = Number(id);
  const numericId = Number(actuatorId);
  const { data: actuator, isLoading } = useActuator(numericId);
  const [editing, setEditing] = useState(false);
  const { data: history, isLoading: historyLoading } = useActuatorHistory(numericId);
  const typeCodeById = useActuatorTypeCodeMap();
  const setState = useSetActuatorState(greenhouseId);
  const { status, snapshot } = useRealtime(greenhouseId);

  if (isLoading || !actuator) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  const live = snapshot?.actuators.find((a) => a.actuator_id === numericId);
  const on = live ? live.state : actuator.state;
  const code = typeCodeById.get(actuator.actuator_type) ?? "";
  const preset = findActuatorPreset(code, actuator.actuator_type_name);

  return (
    <Layout>
      <Link
        to={`/greenhouses/${greenhouseId}/actuators`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Actuadores
      </Link>
      <PageHeader
        title={actuator.name}
        subtitle={actuator.actuator_type_name}
        actions={
          <>
            <ConnectionBadge status={status} />
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </>
        }
      />
      <EditActuatorModal actuator={editing ? actuator : null} greenhouseId={greenhouseId} onClose={() => setEditing(false)} />

      <Card
        className={`mb-6 transition duration-300 ${
          on ? "border-emerald-200 bg-surface" : "bg-surface"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <ActuatorGauge code={code} typeName={actuator.actuator_type_name} on={on} size={96} />
            <div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  on ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {on ? "Encendido" : "Apagado"}
              </span>
              <p className="mt-2 text-xs text-neutral-500">{actuator.description || preset?.description}</p>
            </div>
          </div>
          <button
            onClick={() => setState.mutate({ id: actuator.id, state: !on })}
            disabled={setState.isPending}
            className={`relative h-9 w-16 rounded-full shadow-inner transition disabled:opacity-60 ${
              on ? "bg-brand-600" : "bg-neutral-300"
            }`}
            title={on ? "Apagar" : "Encender"}
            role="switch"
            aria-checked={on}
            aria-label={on ? "Apagar" : "Encender"}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all duration-300 ease-leaf ${on ? "left-8" : "left-1"}`}
            />
          </button>
        </div>
        <div className="mt-3">
          <ErrorText>{setState.isError ? formatApiError(setState.error) : null}</ErrorText>
        </div>
      </Card>

      <ActuatorConnectPanel actuator={actuator} greenhouseId={greenhouseId} />

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <History className="h-4 w-4" /> Historial de cambios
        </h2>
        {historyLoading ? (
          <Spinner />
        ) : !history?.length ? (
          <EmptyState title="Todavía no hay cambios" hint="Cada vez que se encienda o apague, queda registrado aquí." />
        ) : (
          <ul className="divide-y divide-brand-50">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      h.state ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {h.state ? "Encendido" : "Apagado"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-neutral-600">
                    {h.source === "manual" ? <Hand className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    {h.source === "manual" ? `Manual${h.changed_by_username ? ` · ${h.changed_by_username}` : ""}` : "Automatización"}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">{new Date(h.changed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Layout>
  );
}
