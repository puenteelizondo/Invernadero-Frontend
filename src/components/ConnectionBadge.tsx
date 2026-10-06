import { Loader2, WifiOff } from "lucide-react";

/** Estado de la conexión en tiempo real. El punto "late" mientras hay señal. */
export function ConnectionBadge({ status }: { status: "idle" | "connecting" | "open" | "closed" | "error" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping1 rounded-full bg-emerald-500" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        En vivo
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Conectando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
      <WifiOff className="h-3.5 w-3.5" aria-hidden /> Sin tiempo real
    </span>
  );
}
