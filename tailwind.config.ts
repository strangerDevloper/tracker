import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        expense: "hsl(var(--expense))",
        income: "hsl(var(--income))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        full: "var(--radius-full)",
      },
      fontSize: {
        // mobile default / desktop via md: prefix in markup
        display: ["2rem", { lineHeight: "1.2", fontWeight: "600" }],
        h1: ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }],
        h2: ["1.125rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.5" }],
        caption: ["0.8125rem", { lineHeight: "1.4" }],
        // desktop overrides, usable as `md:text-display-lg`
        "display-lg": ["2.5rem", { lineHeight: "1.15", fontWeight: "600" }],
        "h1-lg": ["1.75rem", { lineHeight: "1.2", fontWeight: "600" }],
        "h2-lg": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["1rem", { lineHeight: "1.5" }],
        "caption-lg": ["0.875rem", { lineHeight: "1.4" }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
