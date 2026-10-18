import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { assertNewStableVersion } from './release-version.mjs';
import { releaseTargetForPackage } from './release-target.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = releaseTargetForPackage(process.env.RELEASE_PACKAGE);
const metadata = JSON.parse(readFileSync(join(root, target.artifactDir, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, target.directory, 'package.json'), 'utf8'));
assert.equal(metadata.name, target.name);
assert.equal(manifest.name, target.name);
assert.equal(metadata.version, manifest.version);
assert.equal(process.env.RELEASE_TAG, `${target.tagPrefix}${metadata.version}`);
assert.equal(metadata.filename, `${metadata.name}-${metadata.version}.tgz`);
const tarball = join(root, target.artifactDir, metadata.filename);
const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
assert.equal(integrity, metadata.integrity, 'Verified tarball was modified');

const response = await fetch(`https://registry.npmjs.org/${metadata.name}`);
assert.equal(response.status, 200, 'Cannot check the existing package in the registry');
const registry = await response.json();
const published = registry.versions[metadata.version];
if (published) {
  assert.equal(published.dist.integrity, integrity, 'Version already exists with a different tarball');
  console.log('The identical tarball is already published; continuing release verification.');
} else {
  assertNewStableVersion(metadata.version, registry['dist-tags'].latest);
  execFileSync('npm', ['publish', tarball, '--access', 'public', '--tag', 'latest', '--provenance'], { stdio: 'inherit' });
}
