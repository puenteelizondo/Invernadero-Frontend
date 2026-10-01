import { KeyRound } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { Button, Modal } from "./ui";

/**
 * Muestra la API key completa de un dispositivo. El backend solo la
 * devuelve al crearlo o rotarla, una sola vez -- después solo existe
 * `key_prefix` -- así que esta ventana es la única oportunidad de verla.
 */
export function ApiKeyModal({
  open,
  deviceName,
  apiKey,
  onClose,
}: {
  open: boolean;
  deviceName: string;
  apiKey: string;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`API key de ${deviceName}`} icon={KeyRound}>
      <p className="mb-3 text-sm text-amber-600">
        Cópiala ahora: por seguridad no se volverá a mostrar completa. El controlador físico debe mandarla en el header{" "}
        <code className="rounded bg-neutral-100 px-1">X-Device-Key</code> de cada lectura.
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
        <code className="flex-1 break-all font-mono text-sm text-neutral-900">{apiKey}</code>
        <CopyButton text={apiKey} label="Copiar" className="border border-brand-200 bg-white" />
      </div>
      <div className="mt-5 flex justify-end border-t border-brand-50 pt-4">
        <Button onClick={onClose}>Listo</Button>
      </div>
    </Modal>
  );
}
