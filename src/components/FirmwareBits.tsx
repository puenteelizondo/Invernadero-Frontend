import { useEffect, useState } from "react";
import { AlertTriangle, Download, Info } from "lucide-react";
import { ADC1_PINS } from "../lib/firmware";
import { CopyButton } from "./CopyButton";
import { Button, Input, Select } from "./ui";

/**
 * Piezas compartidas por los generadores de programas de Arduino (Control,
 * sensor y actuador): campos de red, avisos y el visor de código con
 * copiar / descargar. Nada de esto se manda al servidor.
 */

export interface NetSettings {
  ssid: string;
  pass: string;
  host: string;
  port: number;
}

const NET_KEY = "fw-net";

/** ¿Es un dominio (p. ej. algo.trycloudflare.com) y no una IP de red local? */
export function isDomain(host: string): boolean {
  const h = host.trim().replace(/^[a-z]+:\/\//i, "").replace(/[/:].*$/, "");
  return /[a-z]/i.test(h) && !/^localhost$/i.test(h);
}

/** Puerto que corresponde a la dirección: dominio => 443 (HTTPS), IP => 8000 (HTTP local). */
function portFor(host: string, current: number): number {
  if (isDomain(host) && current === 8000) return 443;
  if (!isDomain(host) && host.trim() && current === 443) return 8000;
  return current;
}

function defaultHost(): string {
  const h = window.location.hostname;
  return h === "localhost" || h.startsWith("127.") || h === "::1" || h === "[::1]" ? "" : h;
}

/**
 * WiFi, IP y puerto se recuerdan en esta pestaña (sessionStorage) para no
 * escribirlos en cada página. La contraseña del WiFi NO se guarda.
 */
export function useNetSettings(): [NetSettings, (p: Partial<NetSettings>) => void] {
  const [net, setNet] = useState<NetSettings>(() => {
    let saved: Partial<NetSettings> = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(NET_KEY) || "{}");
    } catch {
      /* sin almacenamiento: valores por defecto */
    }
    const host = saved.host ?? defaultHost();
    // Si la página se abrió por HTTPS (dominio o túnel), el ESP32 también debe usar 443.
    const port = saved.port ?? (window.location.protocol === "https:" ? 443 : 8000);
    return { ssid: saved.ssid ?? "", pass: "", host, port: portFor(host, port) };
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(NET_KEY, JSON.stringify({ ssid: net.ssid, host: net.host, port: net.port }));
    } catch {
      /* ignorar */
    }
  }, [net.ssid, net.host, net.port]);
  return [net, (p) => setNet((n) => ({ ...n, ...p }))];
}

export function isBadHost(host: string): boolean {
  return !host.trim() || /^(localhost|127\.|::1|\[::1\])/i.test(host.trim());
}

export function NetFields({ net, onChange }: { net: NetSettings; onChange: (p: Partial<NetSettings>) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-neutral-800">Red y servidor</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Nombre del WiFi</span>
          <Input value={net.ssid} onChange={(e) => onChange({ ssid: e.target.value })} placeholder="TU_WIFI" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Contraseña del WiFi</span>
          <Input type="password" value={net.pass} onChange={(e) => onChange({ pass: e.target.value })} placeholder="TU_CLAVE" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">IP o dominio del servidor</span>
          <Input value={net.host} onChange={(e) => { const host = e.target.value.trim(); onChange({ host, port: portFor(host, net.port) }); }} placeholder="192.168.1.50 o tu-dominio.com" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Puerto (8000 local · 443 HTTPS)</span>
          <Input type="number" min={1} max={65535} value={net.port} onChange={(e) => onChange({ port: Number(e.target.value) || 8000 })} />
        </label>
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">
        Solo se escribe en el código; no se manda a ningún lado. El WiFi y la IP se recuerdan mientras tengas abierta
        esta pestaña; la contraseña no. Si la pones, se verá en el código de abajo.
      </p>
    </fieldset>
  );
}

export function HostWarning({ host }: { host: string }) {
  if (!isBadHost(host)) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Escribe la <b>IP de tu PC en la red local</b> (en Windows: <code>ipconfig</code> → “Dirección IPv4”). El ESP32
        no puede usar <code>localhost</code>: para él, localhost es él mismo.
      </span>
    </p>
  );
}

export function ConnectTips({ port, extra }: { port: number; extra?: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Si el ESP32 no conecta: agrega esa IP a <code>DJANGO_ALLOWED_HOSTS</code> en el <code>.env</code> del backend y
        permite el puerto {port} en el Firewall de Windows. El monitor serie (115200 baudios) muestra lo que pasa. {extra}
      </span>
    </p>
  );
}

/** Instrucciones comunes de Arduino IDE. `libs` = librerías extra a instalar. */
export function ArduinoSteps({ libs, children }: { libs: React.ReactNode | null; children?: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-700 marker:font-semibold marker:text-brand-700">
      <li>
        Instala <b>Arduino IDE 2</b>. En <i>Gestor de tarjetas</i> instala <b>esp32</b> de Espressif (versión 3.x).
      </li>
      {libs && <li>En <i>Gestor de librerías</i> instala {libs}.</li>}
      <li>Llena los campos de abajo. El código se actualiza solo.</li>
      {children}
      <li>Elige la placa (p. ej. <i>ESP32 Dev Module</i>), el puerto COM y súbelo.</li>
    </ol>
  );
}

/** Lectura de un sensor: "lo escribo yo" o entrada analógica con pin y rango. */
export interface SensorReadValue {
  read: "custom" | "analog" | "test";
  pin: number;
  min: number;
  max: number;
}

export function SensorReadFields({ value, onChange }: { value: SensorReadValue; onChange: (p: Partial<SensorReadValue>) => void }) {
  return (
    <div className="grid items-end gap-2 sm:grid-cols-[14rem_6rem_7rem_7rem]">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-600">Lectura</span>
        <Select value={value.read} onChange={(e) => onChange({ read: e.target.value as SensorReadValue["read"] })}>
          <option value="custom">Lo escribo yo en el código</option>
          <option value="analog">Entrada analógica</option>
          <option value="test">Valor de prueba (simulado)</option>
        </Select>
      </label>
      {value.read === "analog" && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-600">Pin</span>
            <Select value={value.pin} onChange={(e) => onChange({ pin: Number(e.target.value) })}>
              {ADC1_PINS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-600">Valor en 0 V</span>
            <Input type="number" step="any" value={value.min} onChange={(e) => onChange({ min: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-600">Valor en 3.3 V</span>
            <Input type="number" step="any" value={value.max} onChange={(e) => onChange({ max: Number(e.target.value) })} />
          </label>
        </>
      )}
    </div>
  );
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text.replace(/\r?\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Visor del programa: "Solo ajustes" / "Programa completo", copiar y descargar. */
export function CodeView({ settings, full, filename, note }: { settings: string; full: string; filename: string; note?: React.ReactNode }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Qué parte mostrar" className="inline-flex rounded-xl border border-neutral-200 p-0.5 text-sm">
          {[
            { v: false, t: "Solo ajustes" },
            { v: true, t: "Programa completo" },
          ].map((o) => (
            <button
              key={o.t}
              type="button"
              aria-pressed={showFull === o.v}
              onClick={() => setShowFull(o.v)}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${showFull === o.v ? "bg-brand-700 text-white dark:bg-brand-500" : "text-neutral-700 hover:bg-brand-50"}`}
            >
              {o.t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={full} label="Copiar programa" className="border border-neutral-200 bg-surface" />
          <Button variant="secondary" onClick={() => downloadText(`${filename}.ino`, full)}>
            <Download className="h-4 w-4" aria-hidden /> Descargar .ino
          </Button>
        </div>
      </div>
      <pre className="max-h-[28rem] overflow-auto rounded-xl bg-neutral-900 p-4 text-xs leading-relaxed text-emerald-100">
        <code>{showFull ? full : settings}</code>
      </pre>
      <p className="mt-1.5 text-xs text-neutral-500">
        Guárdalo dentro de una carpeta llamada <code>{filename}</code> (Arduino lo exige).{note ? <> {note}</> : null}
      </p>
    </div>
  );
}
