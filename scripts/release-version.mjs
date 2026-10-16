import assert from 'node:assert/strict';

export function assertNewStableVersion(nextVersion, currentVersion) {
  const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  assert.match(nextVersion, stable, 'Release version must be stable semver');
  assert.match(currentVersion, stable, 'Current latest must be stable semver');
  const next = nextVersion.split('.').map(Number);
  const current = currentVersion.split('.').map(Number);
  assert.ok([...next, ...current].every(Number.isSafeInteger), 'Version component exceeds integer precision');
  for (let index = 0; index < 3; index++) {
    if (next[index] > current[index]) return;
    if (next[index] < current[index]) break;
  }
  throw new Error(`Refusing to replace latest ${currentVersion} with ${nextVersion}`);
}
