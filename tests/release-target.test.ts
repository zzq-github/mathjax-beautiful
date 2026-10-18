import { describe, expect, it } from 'vitest';
import { releaseTargetForPackage, releaseTargetForTag } from '../scripts/release-target.mjs';

describe('release tag selects one package', () => {
  it('preserves the Vue default for existing script calls', () => {
    expect(releaseTargetForPackage().name).toBe('vue-mathjax-beautiful');
  });
  it.each(['core', '../react', 'constructor'])('rejects unknown package key %s', key => {
    expect(() => releaseTargetForPackage(key)).toThrow();
  });
  it('keeps existing Vue tags on the Vue package', () => {
    expect(releaseTargetForTag('v1.4.2')).toMatchObject({
      key: 'vue', name: 'vue-mathjax-beautiful', directory: 'packages/core',
      artifactDir: 'dist/release', version: '1.4.2',
    });
  });
  it('selects only React for its independent tag', () => {
    expect(releaseTargetForTag('react-v1.0.3')).toMatchObject({
      key: 'react', name: 'react-mathjax-beautiful', directory: 'packages/react',
      artifactDir: 'dist/release/react', version: '1.0.3',
    });
  });
  it.each(['master', 'react-v1.0.3-beta.1', 'v1.4.2;echo bad', 'react-v01.0.3', 'vue-v1.4.2', 'v1.0'])('rejects invalid release ref %s', tag => {
    expect(() => releaseTargetForTag(tag)).toThrow();
  });
});
