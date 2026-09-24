#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${PSR_SYNC_CONFIG_FILE:-${root}/.psr-sync.env}"

command -v security >/dev/null 2>&1 || {
  echo "This helper requires macOS Keychain's security command." >&2
  exit 69
}

if [[ -f "${config_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${config_file}"
  set +a
fi

db_service="${SUPABASE_DB_PASSWORD_KEYCHAIN_SERVICE:-psrhomes.supabase.db-password}"
secret_service="${SUPABASE_SECRET_KEY_KEYCHAIN_SERVICE:-psrhomes.supabase.secret-key}"

echo "Enter the dedicated PSR Supabase database password when Keychain prompts."
security add-generic-password \
  -U \
  -a "${USER}" \
  -s "${db_service}" \
  -l "PSR Homes Supabase database password" \
  -w

echo "Enter the dedicated PSR Supabase server secret key when Keychain prompts."
security add-generic-password \
  -U \
  -a "${USER}" \
  -s "${secret_service}" \
  -l "PSR Homes Supabase server secret key" \
  -w

echo "Stored the PSR Supabase sync secrets in macOS Keychain."
