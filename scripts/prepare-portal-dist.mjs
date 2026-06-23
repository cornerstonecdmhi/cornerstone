// Firebase Hosting serves a real /index.html before consulting rewrites, so a site
// whose public dir contains the TMS index.html will always serve the TMS app at "/".
// The parent portal therefore needs its OWN public dir whose index.html IS the portal
// entry. This copies dist → dist-portal and promotes portal.html to index.html.
import { rm, cp, copyFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const out = resolve(root, 'dist-portal');

try {
  await access(resolve(dist, 'portal.html'));
} catch {
  console.error('[prepare-portal-dist] dist/portal.html not found — run `vite build` first.');
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await cp(dist, out, { recursive: true });
// Promote the portal entry to be the directory index so "/" serves the portal app.
await copyFile(resolve(dist, 'portal.html'), resolve(out, 'index.html'));
console.log('[prepare-portal-dist] dist-portal ready (portal.html → index.html).');
