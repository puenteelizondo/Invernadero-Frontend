import { useEffect, useState } from "react";
import { NavLink, useMatch, useNavigate } from "react-router-dom";
import { LayoutGroup, motion } from "framer-motion";
import {
  BellRing,
  BookMarked,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
  Gauge,
  LayoutGrid,
  LogOut,
  MapPin,
  Router,
  Sheet,
  SlidersHorizontal,
  UserCog,
  ToggleLeft,
  Users,
  X,
} from "lucide-react";
import { useLogout, useMe } from "../hooks/useAuth";
import { useGreenhouses } from "../hooks/useGreenhouses";
import { useActiveAlerts } from "../hooks/useAlerts";
import { formatApiError } from "../lib/api";
import { spring, useCalm } from "../lib/motion";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { MotionToggle } from "./MotionToggle";

function NavItem({
  to,
  end,
  icon: Icon,
  badge,
  collapsed,
  onNavigate,
  children,
}: {
  to: string;
  end?: boolean;
  icon: typeof Cpu;
  badge?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
  children: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? children : undefined}
      className={({ isActive }) =>
        `group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0" : ""
        } ${isActive ? "text-brand-800" : "text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900"}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-xl border border-brand-200 bg-brand-100/80"
              transition={spring}
            />
          )}
          <Icon
            className={`relative h-[1.15rem] w-[1.15rem] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isActive ? "text-brand-700" : "text-neutral-500 group-hover:text-brand-600"
            }`}
          />
          {!collapsed && <span className="relative truncate">{children}</span>}
          {badge ? (
            <motion.span
              key={badge}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className={`num relative rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ${
                collapsed ? "absolute right-1 top-1" : "ml-auto"
              }`}
              aria-label={`${badge} alertas activas`}
            >
              {badge}
            </motion.span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
  onClose,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  // El menú vive en la ruta padre: se lee el id directamente de la URL.
  const match = useMatch("/greenhouses/:id/*");
  const greenhouseId = match?.params.id && /^\d+$/.test(match.params.id) ? Number(match.params.id) : null;
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: greenhouses } = useGreenhouses();
  const { data: activeAlerts } = useActiveAlerts(greenhouseId);
  const logout = useLogout();
  const current = greenhouses?.find((g) => g.id === greenhouseId);

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center px-4 pb-4 pt-5 ${collapsed ? "justify-center px-2" : "justify-between"}`}>
        <BrandMark collapsed={collapsed} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pb-3">
          <label htmlFor="gh-switch" className="mb-1.5 block px-1 text-xs font-medium text-neutral-500">
            Invernadero activo
          </label>
          <div className="relative">
            <select
              id="gh-switch"
              className="min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-surface py-2.5 pl-3 pr-9 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              value={greenhouseId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  navigate(`/greenhouses/${v}`);
                  onNavigate?.();
                }
              }}
            >
              <option value="" disabled>
                {current ? current.name : "Elegir…"}
              </option>
              {greenhouses?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
          </div>
        </div>
      )}

      <nav aria-label="Principal" className={`flex-1 space-y-0.5 overflow-y-auto py-2 ${collapsed ? "px-2" : "px-3"}`}>
        <NavItem collapsed={collapsed} onNavigate={onNavigate} to="/greenhouses" end icon={LayoutGrid}>
          Invernaderos
        </NavItem>
        {(me?.is_staff || (greenhouses?.length ?? 0) > 0) && (
          <NavItem collapsed={collapsed} onNavigate={onNavigate} to="/catalog" icon={BookMarked}>
            Catálogo de tipos
          </NavItem>
        )}

        {me?.is_staff && (
          <NavItem collapsed={collapsed} onNavigate={onNavigate} to="/users" icon={UserCog}>
            Usuarios
          </NavItem>
        )}

        {greenhouseId && (
          <>
            <div className={`pb-1 pt-5 text-xs font-medium text-neutral-500 ${collapsed ? "sr-only" : "px-3"}`}>
              {current?.name ?? "Este invernadero"}
            </div>
            {collapsed && <div aria-hidden className="mx-3 my-3 border-t border-neutral-200" />}
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}`} end icon={Gauge}>
              Panel
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/control`} icon={SlidersHorizontal}>
              Control
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/sensors`} icon={Cpu}>
              Sensores
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/actuators`} icon={ToggleLeft}>
              Actuadores
            </NavItem>
            <NavItem
              collapsed={collapsed}
              onNavigate={onNavigate}
              to={`/greenhouses/${greenhouseId}/alerts`}
              icon={BellRing}
              badge={activeAlerts?.count}
            >
              Alertas
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/zones`} icon={MapPin}>
              Zonas
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/devices`} icon={Router}>
              Dispositivos
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/members`} icon={Users}>
              Miembros
            </NavItem>
            <NavItem collapsed={collapsed} onNavigate={onNavigate} to={`/greenhouses/${greenhouseId}/export`} icon={Sheet}>
              Exportar
            </NavItem>
          </>
        )}
      </nav>

      <div className={`space-y-3 border-t border-neutral-200/80 ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed && <ThemeToggle id={onClose ? "theme-m" : "theme-d"} />}
        {!collapsed && <MotionToggle id={onClose ? "motion-m" : "motion-d"} />}
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-sm font-semibold uppercase text-white dark:bg-brand-500 dark:text-neutral-50"
            title={me?.username}
          >
            {me?.username?.[0] ?? "?"}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-neutral-900">{me?.username}</p>
              <p className="truncate text-xs text-neutral-500">{me?.is_staff ? "Administrador" : "Sesión activa"}</p>
            </div>
          )}
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <LogOut className="h-[1.1rem] w-[1.1rem]" />
          </button>
        </div>
        {logout.isError && (
          <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">
            No se pudo cerrar la sesión: {formatApiError(logout.error)}
          </p>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex min-h-[36px] w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Contraer</>}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Menú lateral. En escritorio (>= lg) es una columna de vidrio fija que
 * se puede contraer a solo íconos; en celular y tablet es un cajón que
 * se abre desde la barra superior y se cierra al elegir una opción, al
 * tocar fuera, con Escape o arrastrándolo hacia la izquierda.
 */
export function Sidebar({ open = false, onClose = () => {} }: { open?: boolean; onClose?: () => void }) {
  const calm = useCalm();
  // `shown` sigue en true durante la animación de cierre y luego oculta el cajón.
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) setShown(true);
  }, [open]);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
  }, [collapsed]);

  return (
    <>
      <aside
        className={`sticky top-0 z-20 hidden h-dvh shrink-0 border-r border-neutral-200/80 bg-surface/70 backdrop-blur-xl transition-[width] duration-300 ease-leaf lg:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <LayoutGroup id="desk">
          <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </LayoutGroup>
      </aside>

      {/* Cajón móvil: siempre montado y animado entre abierto/cerrado (más robusto que
          desmontarlo, que dejaba el fondo encima de la página si la navegación
          ocurría a mitad de la animación de salida). */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"} ${shown ? "" : "invisible"}`}
        aria-hidden={!open}
      >
        <motion.div
          className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <motion.aside
          aria-label="Menú"
          className="absolute inset-y-0 left-0 w-[19rem] max-w-[86vw] border-r border-neutral-200 bg-surface shadow-2xl"
          initial={false}
          animate={calm ? { opacity: open ? 1 : 0 } : { x: open ? 0 : "-105%" }}
          transition={open ? spring : { duration: 0.2 }}
          onAnimationComplete={() => !open && setShown(false)}
          drag={calm || !open ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.5, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -80 || info.velocity.x < -500) onClose();
          }}
        >
          {shown && (
            <LayoutGroup id="mob">
              <SidebarContent onNavigate={onClose} onClose={onClose} />
            </LayoutGroup>
          )}
        </motion.aside>
      </div>
    </>
  );
}
