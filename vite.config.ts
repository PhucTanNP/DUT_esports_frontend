import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  server: {
    port: 5173,
    host: true, // truy cập từ LAN khi dev
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700, // xlsx nặng — nới giới hạn cảnh báo
  },
});
