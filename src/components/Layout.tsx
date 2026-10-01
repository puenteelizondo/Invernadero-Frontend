import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-brand-50/60 via-neutral-50 to-emerald-50/40">
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
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
