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
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 255, 135, 0.15)",
        "glow-lg": "0 0 50px rgba(0, 255, 135, 0.25)",
      },
    },
  },
  plugins: [],
};
