import { useEffect, useState, type ReactNode } from "react";
import { Menu, Sprout } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  // Cajón del menú en pantallas < lg.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="relative flex min-h-dvh bg-gradient-to-br from-brand-50/60 via-neutral-50 to-emerald-50/40">
      {/* Textura de "vidrio de invernadero": un patrón de rombos muy
          sutil de fondo, puramente decorativo (no interfiere con nada
          interactivo, pointer-events-none). */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #16a34a 25%, transparent 25%), linear-gradient(225deg, #16a34a 25%, transparent 25%), linear-gradient(45deg, #16a34a 25%, transparent 25%), linear-gradient(315deg, #16a34a 25%, transparent 25%)",
          backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
          backgroundSize: "80px 80px",
          backgroundRepeat: "repeat",
        }}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Barra superior: solo en celular y tablet (en escritorio el menú ya está visible). */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-brand-100 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-700 shadow-sm active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-400">
            <Sprout className="h-4 w-4 text-brand-900" />
          </span>
          <p className="text-base font-semibold tracking-tight text-neutral-900">Invernadero</p>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
