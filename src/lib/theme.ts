import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Tema claro ("día de invernadero") / oscuro ("noche de cultivo").
 * Preferencia: "system" (sigue al sistema operativo), "light" o "dark".
 * Se guarda en localStorage; el script de index.html la aplica antes de
 * pintar para evitar el parpadeo.
 */
export type ThemePref = "system" | "light" | "dark";

const KEY = "theme";
const listeners = new Set<() => void>();
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && !!media?.matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0D1812" : "#E9F0E7");
  listeners.forEach((l) => l());
}

media?.addEventListener("change", () => readPref() === "system" && apply("system"));

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"));
  const pref = useSyncExternalStore(subscribe, readPref);
  const setPref = useCallback((p: ThemePref) => {
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* sin almacenamiento: el cambio dura solo esta sesión */
    }
    apply(p);
  }, []);
  return { isDark, pref, setPref, toggle: () => setPref(isDark ? "light" : "dark") };
}

/** Congela animaciones CSS cuando la pestaña no está visible (ver index.css). */
export function usePauseWhenHidden() {
  useEffect(() => {
    const on = () => document.documentElement.classList.toggle("page-hidden", document.hidden);
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
}
