import { NavLink, useParams } from "react-router-dom";
import { BellRing, BookMarked, X, ChevronDown, Cpu, Gauge, LayoutGrid, LogOut, MapPin, Router, Sheet, Sprout, ToggleLeft, Users } from "lucide-react";
import { useLogout, useMe } from "../hooks/useAuth";
import { useGreenhouses } from "../hooks/useGreenhouses";
import { useActiveAlerts } from "../hooks/useAlerts";
import { formatApiError } from "../lib/api";

function navClass(isActive: boolean) {
  return `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-white/15 text-white shadow-inner shadow-white/10 ring-1 ring-white/20"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;
}

function NavItem({
  to,
  end,
  icon: Icon,
  badge,
  onNavigate,
  children,
}: {
  to: string;
  end?: boolean;
  icon: typeof Cpu;
  badge?: number;
  onNavigate?: () => void;
  children: string;
}) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-lime-300" />}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              isActive ? "bg-lime-300/90 text-brand-900" : "bg-white/10 text-white/80 group-hover:bg-white/20"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          {children}
          {badge ? (
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">{badge}</span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/**
 * Menú lateral. En pantallas grandes (>= lg) es una columna fija a la izquierda;
 * en celular y tablet es un cajón que se abre desde el botón de la barra superior
 * (ver Layout) y se cierra al elegir una opción, al tocar fuera o con Escape.
 */
export function Sidebar({ open = false, onClose = () => {} }: { open?: boolean; onClose?: () => void }) {
  const { id } = useParams();
  const greenhouseId = id ? Number(id) : null;
  const { data: me } = useMe();
  const { data: greenhouses } = useGreenhouses();
  const { data: activeAlerts } = useActiveAlerts(greenhouseId);
  const logout = useLogout();

  const current = greenhouses?.find((g) => g.id === greenhouseId);

  return (
    <>
    {/* Fondo oscuro detrás del cajón (solo móvil/tablet) */}
    <div
      aria-hidden
      onClick={onClose}
      className={`fixed inset-0 z-40 bg-brand-900/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    />
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-emerald-900 text-white shadow-xl shadow-brand-900/30 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Textura de cristal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%), linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%)",
          backgroundPosition: "30px 0, 30px 0, 0 0, 0 0",
          backgroundSize: "60px 60px",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-lime-300/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar menú"
        className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-400 shadow-lg shadow-black/20">
          <Sprout className="h-5 w-5 animate-sway text-brand-900" />
        </span>
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight">Invernadero</p>
          <p className="text-[11px] uppercase tracking-wider text-white/50">Monitoreo</p>
        </div>
      </div>

      <div className="relative px-4 pb-3">
        <label className="mb-1.5 block px-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
          Invernadero activo
        </label>
        <div className="relative">
          <select
            className="w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/10 py-2.5 pl-3 pr-9 text-sm font-medium text-white backdrop-blur focus:border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/30"
            value={greenhouseId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) window.location.assign(`/greenhouses/${v}`);
            }}
          >
            <option value="" disabled className="text-neutral-900">
              {current ? current.name : "Elegir..."}
            </option>
            {greenhouses?.map((g) => (
              <option key={g.id} value={g.id} className="text-neutral-900">
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-300" />
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-4 py-2">
        <NavItem onNavigate={onClose} to="/greenhouses" end icon={LayoutGrid}>
          Invernaderos
        </NavItem>
        {(me?.is_staff || (greenhouses?.length ?? 0) > 0) && (
          <NavItem onNavigate={onClose} to="/catalog" icon={BookMarked}>
            Catálogo de tipos
          </NavItem>
        )}

        {greenhouseId && (
          <>
            <div className="mb-1 mt-5 px-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
              Este invernadero
            </div>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}`} end icon={Gauge}>
              Panel
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/sensors`} icon={Cpu}>
              Sensores
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/actuators`} icon={ToggleLeft}>
              Actuadores
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/alerts`} icon={BellRing} badge={activeAlerts?.count}>
              Alertas
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/zones`} icon={MapPin}>
              Zonas
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/devices`} icon={Router}>
              Dispositivos
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/members`} icon={Users}>
              Miembros
            </NavItem>
            <NavItem onNavigate={onClose} to={`/greenhouses/${greenhouseId}/export`} icon={Sheet}>
              Exportar
            </NavItem>
          </>
        )}
      </nav>

      <div className="relative border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime-300 to-emerald-400 text-sm font-bold uppercase text-brand-900">
            {me?.username?.[0] ?? "?"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{me?.username}</p>
            <p className="truncate text-[11px] text-white/50">{me?.is_staff ? "Administrador" : "Sesión activa"}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" /> {logout.isPending ? "Cerrando…" : "Cerrar sesión"}
        </button>
        {logout.isError && (
          <p className="mt-2 rounded-lg bg-red-500/20 px-2 py-1.5 text-xs text-red-100">
            No se pudo cerrar la sesión: {formatApiError(logout.error)}
          </p>
        )}
      </div>
    </aside>
    </>
  );
}
