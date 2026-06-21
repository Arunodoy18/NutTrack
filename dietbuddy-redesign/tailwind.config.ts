import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Strava-style accent
        brand: {
          50: "#FFF1EA",
          100: "#FFE0D2",
          200: "#FFC2A6",
          300: "#FF9D6E",
          400: "#FD7038",
          500: "#FC4C02",
          600: "#E54402",
          700: "#C23A02",
          800: "#9E2F02",
          900: "#7E2602",
          950: "#431301",
          DEFAULT: "#FC4C02",
        },
        ink: {
          DEFAULT: "#242428",
          soft: "#67676F",
          faint: "#9A9AA2",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F4F6",
          line: "#E7E7EB",
        },
      },
      fontFamily: {
        display: ['"Barlow Semi Condensed"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
