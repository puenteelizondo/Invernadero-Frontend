import defaultColors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

/**
 * Sistema de color del invernadero.
 *
 * Todas las paletas que usa la app se resuelven a variables CSS
 * (`rgb(var(--c-brand-600) / <alpha-value>)`), así el MISMO código de
 * clases (`bg-brand-50`, `text-neutral-500`, `bg-emerald-100`...) sirve
 * para el tema claro ("día de invernadero") y el oscuro ("noche de
 * cultivo"): el plugin de abajo escribe los valores de :root y de .dark.
 *
 * - neutral: grises teñidos de verde, como luz filtrada por el vidrio.
 * - brand ("clorofila"): verde profundo y botánico, no el verde neón.
 * - canvas / surface: fondo de página y fondo de tarjetas.
 * - El resto (red, amber, sky...) son las de Tailwind; en oscuro se
 *   invierten los extremos para que "chip claro + texto oscuro" pase a
 *   "chip oscuro + texto claro" sin tocar cada página.
 */

const NEUTRAL_LIGHT = {
  50: "#F2F6F1", 100: "#E6EDE5", 200: "#D3DDD2", 300: "#B4C2B3", 400: "#8A9989",
  500: "#667565", 600: "#4E5B4E", 700: "#3B463B", 800: "#283128", 900: "#182019", 950: "#0E140F",
};
const NEUTRAL_DARK = {
  50: "#16241B", 100: "#1C2B21", 200: "#28382D", 300: "#3A4B3F", 400: "#6B7B6C",
  500: "#8C9B8C", 600: "#A9B5A8", 700: "#C6CFC5", 800: "#DDE4DC", 900: "#EDF2EC", 950: "#F7F9F6",
};
const BRAND_LIGHT = {
  50: "#EEF6EF", 100: "#D7EBDA", 200: "#B2D7B9", 300: "#80BB8C", 400: "#509C62",
  500: "#2F7E48", 600: "#256B3E", 700: "#1F5E3B", 800: "#1A4B31", 900: "#153D29", 950: "#0B2216",
};
const BRAND_DARK = {
  50: "#13271B", 100: "#173222", 200: "#1F4630", 300: "#2C6141", 400: "#4E9A63",
  500: "#5DAA72", 600: "#3F9158", 700: "#8FCB9C", 800: "#B3DDBB", 900: "#D4EDD8", 950: "#EBF7ED",
};
const SURFACE = { light: { canvas: "#E9F0E7", surface: "#FBFCF9", grow: "#C86BD8" }, dark: { canvas: "#0D1812", surface: "#142219", grow: "#D58BE3" } };

// Paletas estándar que aparecen en el código. En oscuro: 50<->950, 100<->900...
const STANDARD = ["emerald", "red", "amber", "lime", "sky", "rose", "teal", "slate", "cyan", "blue", "violet", "orange", "fuchsia", "green", "yellow", "indigo", "purple", "pink"];
const DARK_MAP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 400, 500: 500, 600: 500, 700: 300, 800: 200, 900: 100, 950: 50 };
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const rgb = (hex) => {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
};
const ref = (name, step) => `rgb(var(--c-${name}${step != null ? `-${step}` : ""}) / <alpha-value>)`;

const palettes = { neutral: [NEUTRAL_LIGHT, NEUTRAL_DARK], brand: [BRAND_LIGHT, BRAND_DARK] };
for (const name of STANDARD) {
  const base = defaultColors[name];
  const dark = Object.fromEntries(STEPS.map((s) => [s, base[DARK_MAP[s]]]));
  palettes[name] = [base, dark];
}

const colors = {};
const lightVars = {};
const darkVars = {};
for (const [name, [light, dark]] of Object.entries(palettes)) {
  colors[name] = {};
  for (const s of STEPS) {
    colors[name][s] = ref(name, s);
    lightVars[`--c-${name}-${s}`] = rgb(light[s]);
    darkVars[`--c-${name}-${s}`] = rgb(dark[s]);
  }
  colors[name].DEFAULT = ref(name, 600);
}
for (const key of Object.keys(SURFACE.light)) {
  colors[key] = ref(key);
  lightVars[`--c-${key}`] = rgb(SURFACE.light[key]);
  darkVars[`--c-${key}`] = rgb(SURFACE.dark[key]);
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ...colors,
        white: "#ffffff",
        black: "#000000",
        transparent: "transparent",
        current: "currentColor",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Bricolage Grotesque Variable"', '"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      // Lenguaje de movimiento único para toda la app (ver lib/motion.ts).
      transitionTimingFunction: {
        leaf: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        pane: "0 1px 0 0 rgb(var(--c-neutral-200) / 0.9), 0 8px 24px -16px rgb(var(--c-brand-900) / 0.35)",
        lift: "0 1px 0 0 rgb(var(--c-neutral-200) / 0.9), 0 18px 36px -18px rgb(var(--c-brand-900) / 0.45)",
      },
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        sway: {
          "0%, 100%": { transform: "rotate(-8deg)" },
          "50%": { transform: "rotate(8deg)" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        flicker: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
        "flash-ring": {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--c-brand-500) / 0.45)" },
          "100%": { boxShadow: "0 0 0 10px rgb(var(--c-brand-500) / 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(6deg)" },
        },
        drift: {
          "0%": { transform: "translateX(-10%)", opacity: 0 },
          "15%, 85%": { opacity: 0.9 },
          "100%": { transform: "translateX(110%)", opacity: 0 },
        },
        rise: {
          "0%": { transform: "translateY(12px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Gota de condensación que resbala por el vidrio.
        trickle: {
          "0%": { transform: "translateY(0)", opacity: 0 },
          "10%": { opacity: 0.9 },
          "100%": { transform: "translateY(140px)", opacity: 0 },
        },
        drip: {
          "0%": { transform: "translateY(0)", opacity: 0 },
          "15%": { opacity: 1 },
          "100%": { transform: "translateY(46px)", opacity: 0 },
        },
        // Ondas de calor del calefactor.
        heat: {
          "0%": { transform: "translateY(0)", opacity: 0 },
          "30%": { opacity: 0.7 },
          "100%": { transform: "translateY(-70px)", opacity: 0 },
        },
        // Aire frío que recorre la nave.
        breeze: {
          "0%": { transform: "translateX(-60px)", opacity: 0 },
          "25%, 75%": { opacity: 0.8 },
          "100%": { transform: "translateX(60px)", opacity: 0 },
        },
        // Neblina del nebulizador.
        mist: {
          "0%, 100%": { transform: "translateX(-14px) scale(0.92)", opacity: 0.25 },
          "50%": { transform: "translateX(14px) scale(1.08)", opacity: 0.6 },
        },
        sheen: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        ping1: {
          "0%": { transform: "scale(1)", opacity: 0.6 },
          "100%": { transform: "scale(2.2)", opacity: 0 },
        },
      },
      animation: {
        "spin-slow": "spin-slow 4s linear infinite",
        sway: "sway 2.6s ease-in-out infinite",
        bob: "bob 1.8s ease-in-out infinite",
        flicker: "flicker 2.5s ease-in-out infinite",
        "flash-ring": "flash-ring 0.6s ease-out",
        float: "float 7s ease-in-out infinite",
        drift: "drift 22s linear infinite",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        trickle: "trickle 6s ease-in infinite",
        drip: "drip 1.3s ease-in infinite",
        heat: "heat 2.6s ease-out infinite",
        breeze: "breeze 3.2s ease-in-out infinite",
        mist: "mist 6s ease-in-out infinite",
        sheen: "sheen 2.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s 1 both",
        ping1: "ping1 1.4s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": { ...lightVars, colorScheme: "light" }, ".dark": { ...darkVars, colorScheme: "dark" } });
    }),
  ],
};
