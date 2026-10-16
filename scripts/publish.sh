#!/usr/bin/env bash
set -euo pipefail

# Local validation only. Publishing happens in publish.yml from an existing tag.
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm exec vitest run
pnpm type-check
pnpm build:all
pnpm test:package
echo 'Validation passed. Commit the reviewed version and changelog, then push its matching vX.Y.Z tag to publish.'
