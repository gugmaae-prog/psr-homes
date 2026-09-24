#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${root}"

[[ -f "${root}/.psr-sync.env" ]] || {
  echo "Create .psr-sync.env from .psr-sync.env.example first." >&2
  exit 78
}

set -a
# shellcheck disable=SC1091
source "${root}/.psr-sync.env"
set +a

[[ -n "${SUPABASE_PROJECT_REF:-}" && -n "${SUPABASE_URL:-}" ]] || {
  echo "SUPABASE_PROJECT_REF and SUPABASE_URL are required." >&2
  exit 78
}
expected_url="https://${SUPABASE_PROJECT_REF}.supabase.co"
[[ "${SUPABASE_URL%/}" == "${expected_url}" ]] || {
  echo "SUPABASE_URL does not match SUPABASE_PROJECT_REF." >&2
  exit 78
}

if [[ -z "${SUPABASE_SECRET_KEY:-}" ]] && command -v security >/dev/null 2>&1; then
  keychain_service="${SUPABASE_SECRET_KEY_KEYCHAIN_SERVICE:-psrhomes.supabase.secret-key}"
  SUPABASE_SECRET_KEY="$(security find-generic-password -a "${USER}" -s "${keychain_service}" -w 2>/dev/null || true)"
fi
[[ -n "${SUPABASE_SECRET_KEY:-}" ]] || {
  echo "SUPABASE_SECRET_KEY is required in the environment or macOS Keychain." >&2
  exit 78
}
[[ -x "${root}/node_modules/.bin/wrangler" ]] || npm ci

printf '%s' "${SUPABASE_URL}" | "${root}/node_modules/.bin/wrangler" secret put SUPABASE_URL --config wrangler.jsonc
printf '%s' "${SUPABASE_SECRET_KEY}" | "${root}/node_modules/.bin/wrangler" secret put SUPABASE_SECRET_KEY --config wrangler.jsonc

echo "Supabase server credentials are stored as Cloudflare Worker secrets."
