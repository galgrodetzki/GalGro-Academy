/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070710",
          soft: "#0d0d1a",
          card: "#13131f",
          card2: "#1a1a2a",
          border: "#252540",
        },
        accent: {
          DEFAULT: "#00ff87",
          dark: "#00cc6a",
          glow: "#39ff14",
        },
        orange: {
          DEFAULT: "#ff6b35",
        },
        electric: {
          DEFAULT: "#4488ff",
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
