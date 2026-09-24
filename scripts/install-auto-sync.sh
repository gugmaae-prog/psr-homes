#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hook="${root}/.git/hooks/post-commit"
marker="# psrhomes-auto-sync"

[[ -d "${root}/.git" ]] || {
  echo "Auto-sync must be installed from the PSR Git repository." >&2
  exit 65
}

if [[ -f "${hook}" ]] && ! grep -qF "${marker}" "${hook}"; then
  echo "A custom post-commit hook already exists. Merge it manually instead of overwriting it." >&2
  exit 65
fi

mkdir -p "${root}/.git/hooks"
cat >"${hook}" <<'HOOK'
#!/usr/bin/env bash
# psrhomes-auto-sync
set -eu

root="$(git rev-parse --show-toplevel)"
commit="$(git rev-parse HEAD)"
"${root}/scripts/queue-auto-sync.sh" "${commit}"
HOOK
chmod +x "${hook}"

echo "Installed the guarded post-commit auto-sync hook."
echo "Each release now runs from an immutable detached Git worktree."
echo "Start with PSR_AUTO_SYNC=1 and PSR_AUTO_SYNC_MODE=dry-run."
echo "Use apply mode only after every configured target passes a manual release."
