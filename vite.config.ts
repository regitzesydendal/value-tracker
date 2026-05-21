import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the site lives at https://<user>.github.io/value-tracker/,
// so production builds must prefix asset URLs with "/value-tracker/".
// In dev (`npm run dev`) we keep "/" so http://localhost:5173/ works as usual.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/value-tracker/" : "/",
}));
