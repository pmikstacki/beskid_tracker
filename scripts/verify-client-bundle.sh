#!/usr/bin/env bash
# Fail if production client chunks contain server-only APIs (SQLite, node:path, etc.).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
assets="${root}/.output/public/assets"

bash "$(dirname "$0")/verify-build-assets.sh" "${root}"

if [[ ! -d "${assets}" ]]; then
	echo "verify-client-bundle: missing ${assets} — run 'bun run build' first" >&2
	exit 1
fi

shopt -s nullglob
files=( "${assets}"/*.js )
if [[ ${#files[@]} -eq 0 ]]; then
	echo "verify-client-bundle: no JS files under ${assets}" >&2
	exit 1
fi

if rg -l 'isAbsolute|bun:sqlite|issues\.sqlite|mkdirSync' "${assets}"/*.js >/dev/null 2>&1; then
	echo "verify-client-bundle: server-only symbols found in client assets:" >&2
	rg -n 'isAbsolute|bun:sqlite|issues\.sqlite|mkdirSync' "${assets}"/*.js >&2 || true
	exit 1
fi

echo "verify-client-bundle: ok (${#files[@]} JS chunks)"
