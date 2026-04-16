/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0e17",   // slightly warmer navy-dark, not pure black
          soft: "#111520",      // sidebar / panels
          card: "#181d2e",      // cards — navy tint
          card2: "#1f2538",     // secondary cards
          border: "#2a3048",    // borders — visible but subtle
        },
        accent: {
          DEFAULT: "#00e87a",   // slightly less neon green — easier on eyes
          dark: "#00bf63",
          glow: "#00ff87",
          soft: "rgba(0, 232, 122, 0.12)", // translucent fills for badges/hovers
        },
        // Semantic status palette — use across Apollo, charts, toasts
        danger: {
          DEFAULT: "#ef4444",
          soft: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.25)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          soft: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.25)",
        },
        success: {
          DEFAULT: "#10b981",
          soft: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.25)",
        },
        info: {
          DEFAULT: "#4d8fff",
          soft: "rgba(77, 143, 255, 0.12)",
          border: "rgba(77, 143, 255, 0.25)",
        },
        muted: {
          DEFAULT: "rgba(255,255,255,0.55)",
          soft: "rgba(255,255,255,0.35)",
          faint: "rgba(255,255,255,0.18)",
        },
        orange: {
          DEFAULT: "#ff6b35",
        },
        electric: {
          DEFAULT: "#4d8fff",   // slightly richer blue
          purple: "#a855f7",
          pink: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 255, 135, 0.15)",
        "glow-lg": "0 0 50px rgba(0, 255, 135, 0.25)",
        "glow-danger": "0 0 30px rgba(239, 68, 68, 0.18)",
        "glow-info": "0 0 30px rgba(77, 143, 255, 0.18)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.2)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
