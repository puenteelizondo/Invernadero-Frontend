/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      // Animaciones "de vida" para los íconos de sensores: un
      // movimiento continuo y sutil por tipo (ver sensorPresets.ts),
      // más un "flash" corto que se dispara cada vez que llega una
      // lectura nueva por WebSocket (ver TypeIcon.tsx).
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "sway": {
          "0%, 100%": { transform: "rotate(-8deg)" },
          "50%": { transform: "rotate(8deg)" },
        },
        "bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "flicker": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
        "flash-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(22,163,74,0.45)" },
          "100%": { boxShadow: "0 0 0 10px rgba(22,163,74,0)" },
        },
        // Decoración de las pantallas de acceso (AuthShell).
        "float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(6deg)" },
        },
        "drift": {
          "0%": { transform: "translateX(-10%)", opacity: 0 },
          "15%, 85%": { opacity: 0.9 },
          "100%": { transform: "translateX(110%)", opacity: 0 },
        },
        "rise": {
          "0%": { transform: "translateY(12px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 4s linear infinite",
        "sway": "sway 2.2s ease-in-out infinite",
        "bob": "bob 1.8s ease-in-out infinite",
        "flicker": "flicker 2.5s ease-in-out infinite",
        "flash-ring": "flash-ring 0.6s ease-out",
        "float": "float 7s ease-in-out infinite",
        "drift": "drift 22s linear infinite",
        "rise": "rise 0.6s ease-out both",
        "shimmer": "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};
