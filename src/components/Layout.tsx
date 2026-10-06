import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useMatch, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { PageSkeleton } from "./ui";
import { useActiveAlerts } from "../hooks/useAlerts";
import { pageVariants, useCalm } from "../lib/motion";

/**
 * Las páginas siguen envolviéndose en <Layout> como antes, pero el marco
 * real (menú, barra superior) vive ahora en <AppShell>, montado una sola
 * vez como ruta padre en App.tsx. Así el menú no se desmonta al navegar
 * (su indicador puede deslizarse) y las páginas pueden entrar con una
 * transición. Layout queda como un simple contenedor.
 */
export function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Congela el contenido de la ruta saliente mientras hace su animación de salida. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

function MobileAlertsBell() {
  const match = useMatch("/greenhouses/:id/*");
  const id = match?.params.id && /^\d+$/.test(match.params.id) ? Number(match.params.id) : null;
  const { data } = useActiveAlerts(id);
  if (!id) return null;
  const count = data?.count ?? 0;
  return (
    <Link
      to={`/greenhouses/${id}/alerts`}
      aria-label={count ? `${count} alertas activas` : "Alertas"}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-surface text-neutral-700 shadow-sm"
    >
      <BellRing className={`h-[1.1rem] w-[1.1rem] ${count ? "origin-top animate-sway text-red-600" : ""}`} />
      {count > 0 && (
        <span className="num absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function AppShell() {
  const location = useLocation();
  const calm = useCalm();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Al cambiar de página, volver arriba (como una navegación normal).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh">
      {/* Retícula de paneles de vidrio, muy tenue, de fondo. */}
      <div aria-hidden className="greenhouse-grid pointer-events-none fixed inset-0" />
      <a
        href="#contenido"
        className="sr-only z-[70] rounded-xl bg-surface px-4 py-2 font-semibold text-brand-800 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-neutral-200/80 bg-canvas/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-surface text-neutral-800 shadow-sm active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/greenhouses" className="ml-1 mr-auto" aria-label="Invernadero, inicio">
            <span className="block scale-90 origin-left">
              <BrandMark />
            </span>
          </Link>
          <MobileAlertsBell />
          <ThemeToggle compact />
        </header>

        <main id="contenido" className="min-w-0 flex-1 px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                variants={calm ? undefined : pageVariants}
                initial="initial"
                animate="enter"
                exit="exit"
              >
                <Suspense fallback={<PageSkeleton />}>
                  <FrozenOutlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
