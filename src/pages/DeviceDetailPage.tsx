import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Cable, Cpu, KeyRound, Pencil, RefreshCw, Router, ToggleLeft, Trash2 } from "lucide-react";
import {
  useActuators,
  useDeleteDevice,
  useDevices,
  useRotateDeviceKey,
  useSensors,
  useUpdateDevice,
} from "../hooks/useGreenhouses";
import { useRealtime } from "../hooks/useRealtime";
import { formatApiError } from "../lib/api";
import { STATUS_BADGE, STATUS_LABEL, deviceStatus, timeAgo } from "../lib/deviceStatus";
import { Layout } from "../components/Layout";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { CopyButton } from "../components/CopyButton";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { DeviceGauge } from "../components/DeviceGauge";
import { Button, Card, ConfirmDialog, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Spinner } from "../components/ui";

/**
 * Detalle de un dispositivo: su placa con estado en vivo, datos de
 * conexión (ID, prefijo de la API key, rotarla), qué sensores y
 * actuadores lleva, y un código de ejemplo ya armado con los
 * `sensor_id` de sus sensores. Solo documenta cómo manda datos el
 * hardware; no hay forma de escribir una lectura a mano.
 */
export function DeviceDetailPage() {
  const { id, deviceId } = useParams();
  const navigate = useNavigate();
  const greenhouseId = Number(id);
  const numericId = Number(deviceId);
  const { data: devices, isLoading } = useDevices(greenhouseId);
  const { data: sensors } = useSensors(greenhouseId);
  const { data: actuators } = useActuators(greenhouseId);
  const updateDevice = useUpdateDevice(greenhouseId);
  const rotateKey = useRotateDeviceKey(greenhouseId);
  const deleteDevice = useDeleteDevice(greenhouseId);
  const { status: wsStatus } = useRealtime(greenhouseId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revealed, setRevealed] = useState<{ deviceName: string; apiKey: string } | null>(null);
  // Re-render cada 15 s para que "hace 3 min" y "en línea" no se queden congelados.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const device = devices?.find((d) => d.id === numericId);
  const mySensors = (sensors ?? []).filter((s) => s.device === numericId);
  const myActuators = (actuators ?? []).filter((a) => a.device === numericId);

  if (isLoading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }
  if (!device) {
    return (
      <Layout>
        <EmptyState title="No encontré ese dispositivo" hint="Puede que lo hayan eliminado." />
      </Layout>
    );
  }

  const status = deviceStatus(device);

  const vars = mySensors.map((s) => `  float valor_${s.id} = 0;  // <- lee aquí: ${s.name}`).join("\n");
  const items = mySensors
    .map((s, i) => `  body += "${i ? "," : ""}{\\"sensor_id\\":${s.id},\\"value\\":" + String(valor_${s.id}, 2) + "}";`)
    .join("\n");
  const code = `#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID  = "TU_WIFI";
const char* WIFI_PASS  = "TU_PASSWORD";

// Dirección del backend: la IP de la computadora donde corre (ipconfig) y el puerto 8000.
const char* URL        = "http://<IP-DE-TU-PC>:8000/api/v1/readings/ingest/";

// API key completa de "${device.name}" (empieza con ${device.key_prefix}; se ve una sola vez al crearla o rotarla).
const char* DEVICE_KEY = "PEGA_AQUI_LA_API_KEY";

const unsigned long INTERVALO_MS = 10000;

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void enviarLecturas() {
${vars || "  // Este dispositivo aún no tiene sensores asignados: asígnaselos desde la página de cada sensor."}

  String body = "{\\"readings\\":[";
${items || '  // body += "{\\"sensor_id\\":ID,\\"value\\":" + String(valor, 2) + "}";'}
  body += "]}";

  HTTPClient http;
  http.begin(URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int status = http.POST(body);

  Serial.println(status);            // 200 = llegó (revisa accepted / persisted / rejected)
  Serial.println(http.getString());
  http.end();
}

void loop() {
  enviarLecturas();
  delay(INTERVALO_MS);
}`;

  return (
    <Layout>
      <Link
        to={`/greenhouses/${greenhouseId}/devices`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Dispositivos
      </Link>
      <PageHeader
        icon={Router}
        title={device.name}
        subtitle={`API key: ${device.key_prefix}…`}
        actions={<ConnectionBadge status={wsStatus} />}
      />

      <Card
        className={`mb-6 ${
          status === "online" ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50" : "bg-gradient-to-br from-white to-neutral-50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <DeviceGauge name={device.name} status={status} size={104} />
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_BADGE[status]}`}>
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === "online" ? "animate-pulse bg-emerald-500" : status === "idle" ? "bg-amber-500" : "bg-neutral-400"
                  }`}
                />
                {STATUS_LABEL[status]}
              </span>
              <p className="mt-2 text-sm text-neutral-600">
                {device.last_seen_at
                  ? `Última lectura ${timeAgo(device.last_seen_at)} (${new Date(device.last_seen_at).toLocaleString()})`
                  : "Todavía no ha mandado ninguna lectura."}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                "En línea" = mandó datos en los últimos 5 minutos. Creado el {new Date(device.created_at).toLocaleDateString()}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setNewName(device.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Renombrar
            </Button>
            <Button
              variant="secondary"
              loading={updateDevice.isPending}
              onClick={() => updateDevice.mutate({ id: device.id, is_active: !device.is_active })}
            >
              {device.is_active ? "Desactivar" : "Activar"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmRotate(true)}>
              <RefreshCw className="h-4 w-4" /> Rotar clave
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <ErrorText>{updateDevice.isError ? formatApiError(updateDevice.error) : null}</ErrorText>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-medium text-neutral-900">
            <Cpu className="h-4 w-4" /> Sensores de este dispositivo
          </h2>
          {!mySensors.length ? (
            <p className="text-sm text-neutral-500">
              Ninguno todavía. Entra a un sensor y, en "Conectar este sensor", elige este dispositivo.
            </p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {mySensors.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <Link to={`/greenhouses/${greenhouseId}/sensors/${s.id}`} className="text-neutral-800 hover:text-brand-700">
                    {s.name}
                    <span className="ml-2 text-xs text-neutral-400">{s.sensor_type_name}</span>
                  </Link>
                  <span className="inline-flex items-center rounded-md bg-brand-50 pl-1.5 font-mono text-[11px] font-medium text-brand-700">
                    sensor_id {s.id}
                    <CopyButton text={String(s.id)} className="!px-1 !py-0.5" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-medium text-neutral-900">
            <ToggleLeft className="h-4 w-4" /> Actuadores de este dispositivo
          </h2>
          {!myActuators.length ? (
            <p className="text-sm text-neutral-500">Ninguno todavía.</p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {myActuators.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <Link to={`/greenhouses/${greenhouseId}/actuators/${a.id}`} className="text-neutral-800 hover:text-brand-700">
                    {a.name}
                    <span className="ml-2 text-xs text-neutral-400">{a.actuator_type_name}</span>
                  </Link>
                  <span className="inline-flex items-center rounded-md bg-brand-50 pl-1.5 font-mono text-[11px] font-medium text-brand-700">
                    actuator_id {a.id}
                    <CopyButton text={String(a.id)} className="!px-1 !py-0.5" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
            <Cable className="h-5 w-5 text-brand-700" />
          </span>
          <div>
            <h2 className="font-semibold text-neutral-900">Conectar este dispositivo</h2>
            <p className="text-xs text-neutral-500">Un solo envío con las lecturas de todos sus sensores.</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">ID del dispositivo</p>
              <p className="font-mono text-3xl font-bold text-brand-900">{device.id}</p>
            </div>
            <CopyButton text={String(device.id)} label="Copiar" className="border border-brand-200 bg-white" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-brand-700">
                <KeyRound className="h-3 w-3" /> API key (prefijo)
              </p>
              <p className="truncate font-mono text-xl font-bold text-brand-900">{device.key_prefix}…</p>
              <p className="text-xs text-neutral-500">La clave completa solo se ve al crearla o rotarla.</p>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-700">Ejemplo para Arduino IDE (ESP32)</p>
            <CopyButton text={code} label="Copiar código" />
          </div>
          <pre className="max-h-96 overflow-auto rounded-xl bg-neutral-900 p-4 text-xs leading-relaxed text-emerald-100">
            <code>{code}</code>
          </pre>
          <p className="mt-1.5 text-xs text-neutral-500">
            El backend responde <code>200</code> aunque rechace alguna lectura: mira <code>accepted</code>,{" "}
            <code>persisted</code> y <code>rejected</code> en el cuerpo. Si responde <code>400</code> desde otra máquina,
            agrega la IP de tu PC a <code>DJANGO_ALLOWED_HOSTS</code> en el <code>.env</code> del backend. Un Arduino
            sin WiFi (Uno/Nano) necesita un ESP32/ESP8266 o un módulo WiFi para hacer esta petición.
          </p>
        </div>
      </Card>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Renombrar dispositivo" icon={Pencil}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateDevice.mutate({ id: device.id, name: newName }, { onSuccess: () => setRenameOpen(false) });
          }}
        >
          <div className="mb-4">
            <Label>Nombre</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
          </div>
          <ErrorText>{updateDevice.isError ? formatApiError(updateDevice.error) : null}</ErrorText>
          <div className="mt-5 flex justify-end gap-2 border-t border-brand-50 pt-4">
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={updateDevice.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <ApiKeyModal
        open={revealed != null}
        deviceName={revealed?.deviceName ?? ""}
        apiKey={revealed?.apiKey ?? ""}
        onClose={() => setRevealed(null)}
      />

      <ConfirmDialog
        open={confirmRotate}
        title="Rotar API key"
        message="La clave actual dejará de funcionar de inmediato -- el controlador físico necesitará la nueva para seguir mandando lecturas."
        confirmLabel="Rotar clave"
        danger
        loading={rotateKey.isPending}
        onConfirm={() =>
          rotateKey.mutate(device.id, {
            onSuccess: (d) => {
              setConfirmRotate(false);
              if (d.api_key) setRevealed({ deviceName: d.name, apiKey: d.api_key });
            },
          })
        }
        onCancel={() => setConfirmRotate(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar dispositivo"
        message="Se eliminará el dispositivo y su clave dejará de ser válida. Los sensores/actuadores que lo tenían asignado quedarán sin dispositivo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleteDevice.isPending}
        error={deleteDevice.isError ? formatApiError(deleteDevice.error) : null}
        onConfirm={() =>
          deleteDevice.mutate(device.id, { onSuccess: () => navigate(`/greenhouses/${greenhouseId}/devices`, { replace: true }) })
        }
        onCancel={() => {
          deleteDevice.reset();
          setConfirmDelete(false);
        }}
      />
    </Layout>
  );
}
