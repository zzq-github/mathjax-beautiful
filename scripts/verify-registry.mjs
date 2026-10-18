import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import process from 'node:process';
import { releaseTargetForPackage } from './release-target.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = releaseTargetForPackage(process.env.RELEASE_PACKAGE);
const expected = JSON.parse(readFileSync(resolve(root, target.artifactDir, 'package.json'), 'utf8'));
assert.equal(expected.name, target.name);
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
    if (attempt >= 19) throw error;
    console.log(`Registry not ready (${attempt + 1}/20); retrying in 15 seconds: ${error.message}`);
    await setTimeout(15000);
  }
}
