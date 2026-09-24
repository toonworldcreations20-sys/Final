import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// B-Ceylon Next — React 19 + Vite 7 + Tailwind 4
// Dev:  npm run dev   (binds 0.0.0.0 via CLI flag in preview)
// Build: npm run build → dist/index.html (single file) + dist/photos/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    // mirror tsconfig paths: @/* → src/*
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true, // 0.0.0.0 — required for sandboxed live previews
    allowedHosts: true, // accept the proxied preview hostname
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
