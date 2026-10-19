// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { build } from 'vite';
import { expect, it } from 'vitest';

it('builds direct static entry points for every demo page with the Pages asset base', async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), 'mathjax-static-routes-'));
  const previousBase = process.env.VITE_BASE_URL;
  process.env.VITE_BASE_URL = '/mathjax-beautiful/';
  try {
    await writeFile(
      resolve(fixture, 'index.html'),
      '<div id="app"></div><script type="module" src="/main.js"></script>'
    );
    await writeFile(
      resolve(fixture, 'main.js'),
      'document.querySelector("#app").textContent = "route fixture";'
    );
    await build({
      configFile: resolve('examples/playground/vite.config.ts'),
      root: fixture,
      publicDir: false,
      logLevel: 'silent',
      build: { minify: false, rollupOptions: { output: { manualChunks: () => undefined } } },
    });
    const index = await readFile(resolve(fixture, 'dist/index.html'), 'utf8');
    expect(index).toContain('src="/mathjax-beautiful/assets/');
    for (const route of [
      'demo',
      'config',
      'editor-config',
      'docs',
      'updates',
      'privacy',
      'terms',
    ]) {
      const entry = await readFile(resolve(fixture, 'dist', route, 'index.html'), 'utf8').catch(
        () => null
      );
      expect(entry, `Direct navigation and refresh for /${route}`).toBe(index);
    }
  } finally {
    if (previousBase === undefined) delete process.env.VITE_BASE_URL;
    else process.env.VITE_BASE_URL = previousBase;
    await rm(fixture, { recursive: true, force: true });
  }
}, 20000);
