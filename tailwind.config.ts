import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00FF88",
          50: "#E6FFF3",
          100: "#B3FFD9",
          200: "#80FFBF",
          300: "#4DFFA6",
          400: "#1AFF8C",
          500: "#00FF88",
          600: "#00CC6D",
          700: "#009952",
          800: "#006636",
          900: "#00331B",
        },
        void: {
          DEFAULT: "#0A0A0A",
          50: "#1A1A1A",
          100: "#141414",
          200: "#0F0F0F",
          300: "#0A0A0A",
          400: "#050505",
          500: "#000000",
        },
        surface: {
          DEFAULT: "#111111",
          raised: "#161616",
          overlay: "#1C1C1C",
          border: "#262626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 136, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 255, 136, 0.25)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
