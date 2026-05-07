import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Fraunces"', '"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          warm: "rgb(var(--color-paper-warm) / <alpha-value>)",
          deep: "rgb(var(--color-paper-deep) / <alpha-value>)",
        },
        ember: {
          DEFAULT: "rgb(var(--color-ember) / <alpha-value>)",
          glow: "rgb(var(--color-ember-glow) / <alpha-value>)",
        },
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      maxWidth: {
        prose: "32rem",
        wide: "72rem",
      },
    },
  },
  plugins: [],
};
export default config;
