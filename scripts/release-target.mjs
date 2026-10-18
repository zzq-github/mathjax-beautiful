const targets = {
  vue: { key: 'vue', name: 'vue-mathjax-beautiful', directory: 'packages/core', artifactDir: 'dist/release', tagPrefix: 'v' },
  react: { key: 'react', name: 'react-mathjax-beautiful', directory: 'packages/react', artifactDir: 'dist/release/react', tagPrefix: 'react-v' },
};

export function releaseTargetForPackage(key = 'vue') {
  if (!Object.hasOwn(targets, key)) throw new Error(`Unknown release package: ${key}`);
  return { ...targets[key] };
}

export function releaseTargetForTag(tag) {
  const match = /^(react-)?v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(tag);
  if (!match) throw new Error(`Invalid stable release tag: ${tag}`);
  return { ...releaseTargetForPackage(match[1] ? 'react' : 'vue'), version: match[2] };
}
