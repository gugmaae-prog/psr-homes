#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir=""
commit_ref=""

usage() {
  cat <<'EOF'
Usage: scripts/create-release-archive.sh [--commit <git-ref>] [--output-dir <path>]

Creates a source archive and checksum manifest from one immutable Git commit.
For backwards compatibility, a single positional path is treated as output-dir.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --commit)
      shift
      [[ "$#" -gt 0 ]] || { echo "--commit requires a Git ref." >&2; exit 64; }
      commit_ref="$1"
      ;;
    --output-dir)
      shift
      [[ "$#" -gt 0 ]] || { echo "--output-dir requires a path." >&2; exit 64; }
      output_dir="$1"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${output_dir}" ]]; then
        output_dir="$1"
      else
        echo "Unknown option: $1" >&2
        usage >&2
        exit 64
      fi
      ;;
  esac
  shift
done

output_dir="${output_dir:-${root}/.sync/releases}"

git -C "${root}" rev-parse --verify HEAD >/dev/null 2>&1 || {
  echo "Create the first Git commit before building a release archive." >&2
  exit 65
}

if [[ -z "${commit_ref}" && "${PSR_ALLOW_DIRTY_ARCHIVE:-0}" != "1" ]] && [[ -n "$(git -C "${root}" status --porcelain)" ]]; then
  echo "The repository has uncommitted changes. Commit them before creating a release archive." >&2
  exit 65
fi

commit="$(git -C "${root}" rev-parse --verify "${commit_ref:-HEAD}^{commit}")"
short_commit="$(git -C "${root}" rev-parse --short=12 "${commit}^{commit}")"
archive="${output_dir}/psrhomes-${short_commit}.tar.gz"
manifest="${output_dir}/psrhomes-${short_commit}.json"

mkdir -p "${output_dir}"
git -C "${root}" archive \
  --format=tar.gz \
  --prefix="psrhomes-${short_commit}/" \
  --output="${archive}" \
  "${commit}"

if command -v sha256sum >/dev/null 2>&1; then
  checksum="$(sha256sum "${archive}" | awk '{print $1}')"
else
  checksum="$(shasum -a 256 "${archive}" | awk '{print $1}')"
fi

node --input-type=module - "${manifest}" "${commit}" "$(basename "${archive}")" "${checksum}" <<'NODE'
import { writeFile } from "node:fs/promises";

const [, , path, commit, archive, sha256] = process.argv;
await writeFile(path, `${JSON.stringify({
  application: "psrhomes.ae",
  archive,
  commit,
  createdAt: new Date().toISOString(),
  sha256,
}, null, 2)}\n`);
NODE

printf '%s\n%s\n' "${archive}" "${manifest}"
