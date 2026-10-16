import { describe, expect, it } from 'vitest';
import { assertNewStableVersion } from '../scripts/release-version.mjs';

describe('release latest version guard', () => {
  it.each([
    ['1.4.2', '1.4.1'],
    ['1.10.0', '1.9.9'],
    ['2.0.0', '1.99.99'],
  ])('allows %s to follow %s', (next, current) => {
    expect(() => assertNewStableVersion(next, current)).not.toThrow();
  });

  it.each([
    ['1.4.2', '1.4.3'],
    ['1.4.2', '1.4.2'],
    ['1.9.9', '1.10.0'],
    ['1.4.2-beta.1', '1.4.1'],
    ['1.4.2', 'invalid'],
  ])('rejects %s after %s before changing latest', (next, current) => {
    expect(() => assertNewStableVersion(next, current)).toThrow();
  });
});
