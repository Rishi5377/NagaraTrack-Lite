import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// https://vitejs.dev/config/
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5000,
  },
  // Support GitHub Pages by providing a base path
  base: mode === 'production' ? '/NagaraTrack-Lite/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // Ensure assets are properly handled for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          map: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  // Define environment variables for static mode
  define: {
    'import.meta.env.VITE_STATIC_MODE': JSON.stringify('true'),
  },
}));
