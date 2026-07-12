import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { execSync } from 'node:child_process';

// Build stamp — Sentry release maps to an exact commit; UI can show the precise build.
const git = (cmd: string, fb = 'unknown') => { try { return execSync(cmd).toString().trim(); } catch { return fb; } };
const GIT_COMMIT = git('git rev-parse --short HEAD');
const GIT_BRANCH = git('git rev-parse --abbrev-ref HEAD');
const BUILD_TIME = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(GIT_COMMIT),
    __GIT_BRANCH__: JSON.stringify(GIT_BRANCH),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
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
