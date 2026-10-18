import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = resolve(root, 'dist/release/react');
const manifest = JSON.parse(readFileSync(join(root, 'packages/react/package.json'), 'utf8'));
const publishedMode = process.argv.includes('--published');
const expectedIntegrity = publishedMode
  ? JSON.parse(readFileSync(join(artifactDir, 'package.json'), 'utf8')).integrity
  : null;
let consumer = mkdtempSync(join(tmpdir(), 'mathjax-react18-package-'));
const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
  : [];
function npm(args, cwd = consumer, capture = false) {
  return execFileSync(npmCommand, [...npmPrefix, ...args], {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: { ...process.env, npm_config_registry: 'https://registry.npmjs.org/' },
  });
}
function write(name, content) { writeFileSync(join(consumer, name), content); }

mkdirSync(artifactDir, { recursive: true });
const packArgs = ['pack', ...(publishedMode ? [`${manifest.name}@${manifest.version}`] : []), '--json', '--pack-destination', artifactDir];
const [packed] = JSON.parse(npm(packArgs, publishedMode ? consumer : join(root, 'packages/react'), true));
const artifact = join(artifactDir, packed.filename);
assert.equal(packed.name, 'react-mathjax-beautiful');
assert.equal(packed.version, manifest.version);
if (publishedMode) assert.equal(packed.integrity, expectedIntegrity, 'Registry artifact differs from the verified tarball');
const packageSpec = publishedMode ? packed.version : `file:${artifact}`;
for (const path of ['dist/react-mathjax-beautiful.js', 'dist/react-mathjax-beautiful.umd', 'dist/style.css', 'dist/index.d.ts', 'README.md', 'CHANGELOG.md']) {
  assert.ok(packed.files.some(file => file.path === path && file.size > 0), `Missing package file: ${path}`);
}
assert.ok(packed.files.every(file => !/^(src|examples|node_modules)\//.test(file.path)), 'Workspace files leaked into package');
write('package.json', JSON.stringify({
  name: 'react-mathjax-package-consumer', private: true, type: 'module',
  dependencies: { 'react-mathjax-beautiful': packageSpec, react: '18.0.0', 'react-dom': '18.0.0' },
  devDependencies: { '@types/react': '18.3.23', '@types/react-dom': '18.3.7', typescript: '5.3.3', vite: '5.4.19', '@types/node': '18.19.3' },
}, null, 2));
console.log(`React package consumer: ${consumer}`);
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false']);
const installed = JSON.parse(readFileSync(join(consumer, 'node_modules/react-mathjax-beautiful/package.json'), 'utf8'));
assert.equal(installed.version, packed.version);
if (publishedMode) {
  const installedMetadata = JSON.parse(npm(['ls', 'react-mathjax-beautiful', '--json'], consumer, true));
  assert.equal(installedMetadata.dependencies['react-mathjax-beautiful'].version, manifest.version);
}
assert.ok(!JSON.stringify(installed).includes('workspace:'), 'Unresolved workspace dependency');
for (const target of [installed.main, installed.module, installed.types, ...Object.values(installed.exports).flatMap(value => typeof value === 'string' ? [value] : Object.values(value))]) {
  assert.ok(existsSync(join(consumer, 'node_modules/react-mathjax-beautiful', target)), `Missing entry: ${target}`);
}
write('runtime.mjs', `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as esm from 'react-mathjax-beautiful';
const require = createRequire(import.meta.url);
const cjs = require('react-mathjax-beautiful');
for (const api of [esm, cjs]) {
  assert.equal(typeof api.MathjaxBeautiful, 'function');
  assert.equal(typeof api.loadMathJax, 'function');
  assert.equal(api.hasLatexFormula('$x$'), true);
  assert.equal(api.escapeHtml('<x>'), '&lt;x&gt;');
  const html = renderToString(createElement(api.MathjaxBeautiful, {
    inline: true, value: 'PACKAGE_SMOKE', autoFocus: false,
    showSymbols: false, showPreview: false, showFormulaExamples: false,
  }));
  assert.ok(html.includes('<textarea'));
  assert.ok(html.includes('PACKAGE_SMOKE'));
}
assert.ok(require.resolve('react-mathjax-beautiful/style.css').endsWith('style.css'));
assert.equal(require.resolve('react-mathjax-beautiful/style.css'), require.resolve('react-mathjax-beautiful/dist/style.css'));
`);
write('consumer.tsx', `
import { createRoot } from 'react-dom/client';
import { MathjaxBeautiful, escapeHtml, type MathjaxBeautifulProps, type MathJaxConfig } from 'react-mathjax-beautiful';
import 'react-mathjax-beautiful/style.css';
import 'react-mathjax-beautiful/dist/style.css';
const props: MathjaxBeautifulProps = { inline: true, value: 'x^2', onInsert: latex => console.log(latex), theme: 'light', locale: 'en-US' };
const config: MathJaxConfig = { tex: { inlineMath: [['$', '$']] } };
console.log(escapeHtml('<x>'), config);
createRoot(document.getElementById('app')!).render(<MathjaxBeautiful {...props} />);
`);
write('index.html', '<div id="app"></div><script type="module" src="/consumer.tsx"></script>');
function checkConsumer() {
  npm(['ls', 'react', 'react-dom', '--all']);
  execFileSync(process.execPath, ['runtime.mjs'], { cwd: consumer, stdio: 'inherit' });
  for (const [module, moduleResolution] of [['ESNext', 'Bundler'], ['NodeNext', 'NodeNext']]) {
    write('tsconfig.json', JSON.stringify({ compilerOptions: {
      target: 'ES2020', module, moduleResolution, strict: true, noEmit: true, jsx: 'react-jsx',
      esModuleInterop: true, skipLibCheck: false, lib: ['ES2020', 'DOM'],
    }, include: ['consumer.tsx'] }));
    execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { cwd: consumer, stdio: 'inherit' });
  }
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: consumer, stdio: 'inherit' });
}
checkConsumer();
const react18Consumer = consumer;
consumer = mkdtempSync(join(tmpdir(), 'mathjax-react19-package-'));
for (const name of ['runtime.mjs', 'consumer.tsx', 'index.html']) copyFileSync(join(react18Consumer, name), join(consumer, name));
write('package.json', JSON.stringify({
  name: 'react19-mathjax-package-consumer', private: true, type: 'module',
  dependencies: { 'react-mathjax-beautiful': packageSpec, react: '19.0.0', 'react-dom': '19.0.0' },
  devDependencies: { '@types/react': '19.0.0', '@types/react-dom': '19.0.0', typescript: '5.3.3', vite: '5.4.19', '@types/node': '18.19.3' },
}, null, 2));
console.log(`React 19 consumer: ${consumer}`);
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false']);
checkConsumer();
writeFileSync(join(artifactDir, 'package.json'), JSON.stringify({ name: packed.name, version: packed.version, filename: packed.filename, integrity: packed.integrity }, null, 2));
console.log(`React package verified: ${packed.name}@${packed.version}\nArtifact: ${artifact}\nConsumer: ${consumer}`);
