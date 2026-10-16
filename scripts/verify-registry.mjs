import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expected = JSON.parse(readFileSync(resolve(root, 'dist/release/package.json'), 'utf8'));
for (let attempt = 0; ; attempt++) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${expected.name}`, { cache: 'no-store' });
    assert.equal(response.status, 200);
    const registry = await response.json();
    const published = registry.versions[expected.version];
    assert.ok(published, 'Published version not visible in registry');
    assert.equal(published.dist.integrity, expected.integrity, 'Published tarball differs from the verified artifact');
    assert.equal(registry['dist-tags'].latest, expected.version);
    console.log(`Registry verified: ${expected.name}@${expected.version} (matching integrity and latest tag)`);
    break;
  } catch (error) {
    if (attempt >= 5) throw error;
    await setTimeout(5000);
  }
}
