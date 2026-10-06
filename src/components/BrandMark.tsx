/** Logotipo: casita de vidrio con un brote, más el nombre. */
export function BrandMark({ tone = "default", collapsed = false }: { tone?: "default" | "light"; collapsed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-10 w-10 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#1F5E3B" />
        <path d="M12 50V30L32 14l20 16v20" fill="none" stroke="#D7EBDA" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M32 50V36" stroke="#80BB8C" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M32 40c0-6 4-9 10-9 0 6-4 9-10 9zM32 43c0-5-3.5-8-9-8 0 5 3.5 8 9 8z" fill="#80BB8C" />
      </svg>
      {!collapsed && (
        <span
          className={`font-display text-[1.2rem] font-semibold leading-none tracking-tight ${
            tone === "light" ? "text-white drop-shadow" : "text-neutral-900"
          }`}
        >
          Invernadero
        </span>
      )}
    </span>
  );
}
