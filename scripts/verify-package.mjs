import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = resolve(root, 'dist/release');
const consumer = mkdtempSync(join(tmpdir(), 'mathjax-package-'));
const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
  : [];

function npm(args, cwd, capture = false) {
  return execFileSync(npmCommand, [...npmPrefix, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: { ...process.env, npm_config_registry: 'https://registry.npmjs.org/' },
  });
}

function write(name, content) {
  writeFileSync(join(consumer, name), content);
}

mkdirSync(artifactDir, { recursive: true });
const [packed] = JSON.parse(npm(['pack', '--json', '--pack-destination', artifactDir], join(root, 'packages/core'), true));
const artifact = join(artifactDir, packed.filename);
assert.equal(packed.name, 'vue-mathjax-beautiful');
for (const path of [
  'dist/vue-mathjax-beautiful.js',
  'dist/vue-mathjax-beautiful.umd',
  'dist/style.css',
  'dist/index.d.ts',
  'README.md',
  'CHANGELOG.md',
]) {
  assert.ok(packed.files.some(file => file.path === path && file.size > 0), `Missing package file: ${path}`);
}
assert.ok(packed.files.every(file => !/^(src|examples|node_modules)\//.test(file.path)), 'Source/workspace files leaked into package');

write('package.json', JSON.stringify({
  name: 'mathjax-package-consumer', private: true, type: 'module',
  dependencies: { 'vue-mathjax-beautiful': `file:${artifact}`, vue: '3.3.0' },
  devDependencies: { typescript: '5.3.3', vite: '5.4.19', '@types/node': '18.19.3' },
}, null, 2));
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], consumer);
const installed = JSON.parse(readFileSync(join(consumer, 'node_modules/vue-mathjax-beautiful/package.json'), 'utf8'));
assert.equal(installed.version, packed.version);
assert.ok(!JSON.stringify(installed).includes('workspace:'), 'Unresolved workspace dependency');
for (const target of [installed.main, installed.module, installed.types, ...Object.values(installed.exports).flatMap(value => typeof value === 'string' ? [value] : Object.values(value))]) {
  assert.ok(existsSync(join(consumer, 'node_modules/vue-mathjax-beautiful', target)), `Unresolved package entry: ${target}`);
}

write('runtime.mjs', `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'vue-mathjax-beautiful';
const require = createRequire(import.meta.url);
const cjs = require('vue-mathjax-beautiful');
for (const api of [esm, cjs]) {
  assert.equal(typeof api.install, 'function');
  assert.ok(api.VueMathjaxBeautiful);
  assert.ok(api.VueMathjaxEditor);
  assert.equal(api.default.install, api.install);
  assert.equal(api.hasLatexFormula('$x$'), true);
  assert.equal(api.escapeHtml('<x>'), '&lt;x&gt;');
}
assert.ok(require.resolve('vue-mathjax-beautiful/style.css').endsWith('style.css'));
assert.equal(require.resolve('vue-mathjax-beautiful/style.css'), require.resolve('vue-mathjax-beautiful/dist/style.css'));
`);
execFileSync(process.execPath, ['runtime.mjs'], { cwd: consumer, stdio: 'inherit' });

write('consumer.ts', `
import plugin, { VueMathjaxEditor, VueMathjaxBeautiful, escapeHtml } from 'vue-mathjax-beautiful';
import type { VueMathjaxBeautifulProps, VueMathjaxEditorProps } from 'vue-mathjax-beautiful';
import { createApp, h } from 'vue';
import 'vue-mathjax-beautiful/style.css';
import 'vue-mathjax-beautiful/dist/style.css';
const formula: VueMathjaxBeautifulProps = { symbolWidth: '2rem', symbolHeight: 40, symbolGap: 0 };
const editor: VueMathjaxEditorProps = { modelValue: 'hello', formulaEditorProps: { ...formula } };
const app = createApp({ render: () => h(VueMathjaxEditor, editor) });
app.use(plugin);
console.log(VueMathjaxBeautiful, escapeHtml('<x>'));
`);
write('index.html', '<div id="app"></div><script type="module" src="/consumer.ts"></script>');
function checkConsumer() {
  for (const [module, moduleResolution] of [['ESNext', 'Bundler'], ['NodeNext', 'NodeNext']]) {
    write('tsconfig.json', JSON.stringify({ compilerOptions: {
      target: 'ES2020', module, moduleResolution, strict: true, noEmit: true,
      skipLibCheck: false, lib: ['ES2020', 'DOM'],
    }, include: ['consumer.ts'] }));
    execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { cwd: consumer, stdio: 'inherit' });
  }
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: consumer, stdio: 'inherit' });
}
checkConsumer();
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', 'vue@3.5.17', 'typescript@5.4.5'], consumer);
execFileSync(process.execPath, ['runtime.mjs'], { cwd: consumer, stdio: 'inherit' });
checkConsumer();
writeFileSync(join(artifactDir, 'package.json'), JSON.stringify({
  name: packed.name, version: packed.version, filename: packed.filename, integrity: packed.integrity,
}, null, 2));
console.log(`Package verified: ${packed.name}@${packed.version}\nArtifact: ${artifact}\nConsumer: ${consumer}`);
