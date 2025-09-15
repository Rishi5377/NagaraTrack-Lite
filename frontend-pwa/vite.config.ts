import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// https://vitejs.dev/config/
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5000,
  },
  // Support GitHub Pages by providing a base path like "/<repo>/"
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));
