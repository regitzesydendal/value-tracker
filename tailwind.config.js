/** @type {import('tailwindcss').Config} */

// Dark "vault" theme.
//
// The components are written with Tailwind's light-theme vocabulary
// (bg-white cards, text-neutral-900 headings, border-neutral-200 …). Instead of
// rewriting every class, the palette below re-maps those names onto a dark
// theme:
//   - `white` is the card/surface colour (so `text-white` on a light button
//     reads as dark text).
//   - the `neutral` scale is inverted: 50 = darkest panel tint, 900 = brightest
//     foreground. So `text-neutral-900` is still "strongest text" and
//     `border-neutral-200` is still "subtle border".
//   - the few tinted status colours (red/green/amber/…) are re-tuned so light
//     tints become dark tints and dark text becomes light text.
// Delete the `colors` overrides to get the original light theme back.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#0b0f17", // page background
        white: "#131a26", // surface (cards, modals, inputs)
        accent: {
          DEFAULT: "#f2c14e", // gold
          soft: "#f7d47f",
          deep: "#c9952a",
        },
        neutral: {
          50: "#0f151f",
          100: "#1a2230",
          200: "#242d3d",
          300: "#333d50",
          400: "#5d687d",
          500: "#8b95a8",
          600: "#aab3c3",
          700: "#c8cfdb",
          800: "#e1e5ec",
          900: "#f3f5f9",
          950: "#ffffff",
        },
        red: { 50: "#2a1517", 100: "#3a1b1e", 200: "#5c262b", 600: "#f87171", 700: "#fca5a5" },
        green: { 600: "#4ade80", 700: "#22c55e" },
        amber: {
          50: "#271f10",
          100: "#3a2c12",
          200: "#5c4519",
          500: "#f2c14e",
          600: "#f7d47f",
          700: "#fbbf24",
          800: "#fcd34d",
          900: "#fde68a",
        },
        blue: { 50: "#13213a", 100: "#152a4a", 600: "#60a5fa", 800: "#93c5fd" },
        violet: { 100: "#2e2350" },
        emerald: { 100: "#123a2c" },
      },
    },
  },
  plugins: [],
};
