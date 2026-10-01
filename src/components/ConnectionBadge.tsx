import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function ConnectionBadge({ status }: { status: "idle" | "connecting" | "open" | "closed" | "error" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Wifi className="h-3.5 w-3.5" /> En vivo
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
      <WifiOff className="h-3.5 w-3.5" /> Sin tiempo real
    </span>
  );
}
