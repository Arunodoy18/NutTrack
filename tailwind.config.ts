import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--bg-card)",
        col: "var(--bg-col)",
        input: "var(--bg-input)",
        border: "var(--border)",
        "border-s": "var(--border-s)",
        txt: "var(--txt)",
        "txt-2": "var(--txt-2)",
        "txt-h": "var(--txt-h)",
        green: "var(--green)",
        "green-l": "var(--green-l)",
        orange: "var(--orange)",
        "orange-l": "var(--orange-l)",
        red: "var(--red)",
        "red-l": "var(--red-l)",
        blue: "var(--blue)",
        "blue-l": "var(--blue-l)",
        white: "var(--white)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        custom: '0 1px 3px rgba(44,42,37,0.08), 0 1px 2px rgba(44,42,37,0.06)',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        input: '8px',
        pill: '20px',
      },
    },
  },
  plugins: [],
};
export default config;
