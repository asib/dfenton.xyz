#!/usr/bin/env bash
# Cloudflare Pages build command. Pages only takes a Bun version from its
# BUN_VERSION setting, so install the one package.json's packageManager names,
# keeping the toolchain version in the repo. Run with SKIP_DEPENDENCY_INSTALL=true
# so Pages doesn't install dependencies with its own Bun first.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').packageManager.replace(/^bun@/, '')")
if [ "$(bun --version 2>/dev/null)" != "$version" ]; then
  prefix=$(mktemp -d)
  # Bun's postinstall puts the native binary in place; newer npm only runs
  # install scripts it's told to allow.
  npm install --global --prefix "$prefix" --no-audit --no-fund --allow-scripts=bun "bun@$version"
  export PATH="$prefix/bin:$PATH"
fi
if [ "$(bun --version)" != "$version" ]; then
  echo "Expected Bun $version, got $(bun --version)" >&2
  exit 1
fi

bun install --frozen-lockfile
bun run build
