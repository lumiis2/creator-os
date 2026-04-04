import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0b1021",
        card: "#111827",
        border: "#1f2937",
        muted: "#9ca3af",
        primary: "#2563eb",
      },
    },
  },
  plugins: [],
};

export default config;
