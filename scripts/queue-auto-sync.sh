#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${PSR_SYNC_CONFIG_FILE:-${root}/.psr-sync.env}"

if [[ -f "${config_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${config_file}"
  set +a
fi

[[ "${PSR_AUTO_SYNC:-0}" == "1" ]] || exit 0

commit="$(git -C "${root}" rev-parse --verify "${1:-HEAD}^{commit}")"
state_dir="${PSR_SYNC_STATE_DIR:-${root}/.sync}"
requested_file="${state_dir}/auto-sync.requested"
lock_dir="${state_dir}/auto-sync.lock"

mkdir -p "${state_dir}"
temporary_request="${requested_file}.$$"
printf '%s\n' "${commit}" >"${temporary_request}"
mv "${temporary_request}" "${requested_file}"

start_runner() {
  nohup "${root}/scripts/run-auto-sync.sh" \
    >>"${state_dir}/auto-sync.log" 2>&1 </dev/null &
  printf '%s\n' "$!" >"${lock_dir}/pid"
}

recover_stale_lock() {
  local runner_pid=""

  if [[ ! -f "${lock_dir}/pid" ]]; then
    sleep 1
  fi
  [[ -d "${lock_dir}" ]] || return 0
  [[ -f "${lock_dir}/pid" ]] && runner_pid="$(tr -d '[:space:]' <"${lock_dir}/pid")"
  if [[ "${runner_pid}" =~ ^[0-9]+$ ]] && kill -0 "${runner_pid}" 2>/dev/null; then
    return 1
  fi

  rm -f "${lock_dir}/pid"
  rmdir "${lock_dir}" 2>/dev/null
}

if mkdir "${lock_dir}" 2>/dev/null; then
  start_runner
elif recover_stale_lock && mkdir "${lock_dir}" 2>/dev/null; then
  echo "Recovered a stale PSR auto-sync lock." >>"${state_dir}/auto-sync.log"
  start_runner
fi
