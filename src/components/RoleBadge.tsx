import type { Role } from "../types";

const LABELS: Record<Role, string> = {
  owner: "Propietario",
  operator: "Operador",
  viewer: "Solo lectura",
};

const STYLES: Record<Role, string> = {
  owner: "bg-brand-100 text-brand-700",
  operator: "bg-amber-100 text-amber-700",
  viewer: "bg-neutral-100 text-neutral-600",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[role]}`}>
      {LABELS[role]}
    </span>
  );
}
