import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Botón chiquito que copia `text` al portapapeles y confirma con una palomita. */
export function CopyButton({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    // Puede vivir dentro de un <Link>/tarjeta clicable: no dejar que el clic navegue.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sin permiso de portapapeles (p. ej. http sin localhost): selección manual como respaldo.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span>{copied ? "Copiado" : label}</span>}
    </button>
  );
}
