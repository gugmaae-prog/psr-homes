#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_dir="${PSR_SYNC_STATE_DIR:-${root}/.sync}"
requested_file="${state_dir}/auto-sync.requested"
completed_file="${state_dir}/auto-sync.completed"
lock_dir="${state_dir}/auto-sync.lock"
worktree_parent="${state_dir}/worktrees"
config_file="${PSR_SYNC_CONFIG_FILE:-${root}/.psr-sync.env}"
active_worktree=""
lock_held=1

cleanup() {
  if [[ -n "${active_worktree}" ]]; then
    git -C "${root}" worktree remove --force "${active_worktree}" >/dev/null 2>&1 || true
  fi
  if [[ "${lock_held}" == "1" ]]; then
    rm -f "${lock_dir}/pid"
    rmdir "${lock_dir}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM
[[ -d "${lock_dir}" ]] && printf '%s\n' "$$" >"${lock_dir}/pid"

if [[ -f "${config_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${config_file}"
  set +a
fi

sync_mode="${PSR_AUTO_SYNC_MODE:-apply}"
case "${sync_mode}" in
  apply|dry-run) ;;
  *) echo "PSR_AUTO_SYNC_MODE must be apply or dry-run." >&2; exit 78 ;;
esac

record_failure() {
  local commit="$1"
  node --input-type=module - "${state_dir}/last-failure.json" "${commit}" <<'NODE'
import { rename, writeFile } from "node:fs/promises";

const [, , path, commit] = process.argv;
const temporaryPath = `${path}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify({
  application: "psrhomes.ae",
  commit,
  failedAt: new Date().toISOString(),
  log: ".sync/auto-sync.log",
  status: "failed",
}, null, 2)}\n`);
await rename(temporaryPath, path);
NODE
}

release_commit() {
  local commit="$1"
  local short_commit
  local status

  short_commit="$(git -C "${root}" rev-parse --short=12 "${commit}^{commit}")" || return 1
  mkdir -p "${worktree_parent}"
  active_worktree="${worktree_parent}/psrhomes-${short_commit}-$$"

  git -C "${root}" worktree add --detach --quiet "${active_worktree}" "${commit}" || return 1
  PSR_SYNC_CONFIG_FILE="${config_file}" \
  PSR_SYNC_STATE_DIR="${state_dir}" \
  PSR_RELEASE_ARCHIVE_DIR="${state_dir}/releases" \
    "${active_worktree}/scripts/sync-platforms.sh" --"${sync_mode}" --commit "${commit}"
  status=$?

  git -C "${root}" worktree remove --force "${active_worktree}" >/dev/null 2>&1 || true
  active_worktree=""
  return "${status}"
}

while true; do
  [[ -f "${requested_file}" ]] || exit 0
  requested_commit="$(tr -d '[:space:]' <"${requested_file}")"
  git -C "${root}" rev-parse --verify "${requested_commit}^{commit}" >/dev/null 2>&1 || {
    echo "Auto-sync request is not a valid commit: ${requested_commit}" >&2
    record_failure "${requested_commit}"
    exit 1
  }

  completed_commit=""
  [[ -f "${completed_file}" ]] && completed_commit="$(tr -d '[:space:]' <"${completed_file}")"
  if [[ "${completed_commit}" != "${requested_commit}" ]]; then
    echo "Starting immutable PSR release ${requested_commit}."
    if release_commit "${requested_commit}"; then
      printf '%s\n' "${requested_commit}" >"${completed_file}"
      rm -f "${state_dir}/last-failure.json"
      echo "Completed immutable PSR release ${requested_commit}."
    else
      echo "PSR auto-sync failed for ${requested_commit}." >&2
      record_failure "${requested_commit}"
      exit 1
    fi
  fi

  sleep 2
  latest_request="$(tr -d '[:space:]' <"${requested_file}")"
  [[ "${latest_request}" != "${requested_commit}" ]] && continue

  rm -f "${lock_dir}/pid"
  rmdir "${lock_dir}" >/dev/null 2>&1 || true
  lock_held=0
  latest_request="$(tr -d '[:space:]' <"${requested_file}")"
  if [[ "${latest_request}" != "${requested_commit}" ]] && mkdir "${lock_dir}" 2>/dev/null; then
    lock_held=1
    printf '%s\n' "$$" >"${lock_dir}/pid"
    continue
  fi
  exit 0
done
