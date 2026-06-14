import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  preview: { port: 5174 },
  build: {
    rollupOptions: {
      input: {
        // Two separate apps from one repo: the staff TMS and the parent portal.
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal.html'),
      },
    },
  },
});
