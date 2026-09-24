#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="dry-run"
skip_tests=0
commit_ref=""

usage() {
  cat <<'EOF'
Usage: scripts/sync-platforms.sh [--dry-run|--apply] [--skip-tests] [--commit <git-ref>]

Synchronizes one committed PSR release across the configured targets:
  cloudflare  Apply D1 migrations and deploy the production Worker.
  supabase    Push only checked-in Supabase migrations.
  aws         Upload a versioned source archive and manifest to private S3.

Apply mode always deploys the checked-out commit from a clean worktree. The
auto-sync runner creates a detached worktree before invoking this command.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run) mode="dry-run" ;;
    --apply) mode="apply" ;;
    --skip-tests) skip_tests=1 ;;
    --commit)
      shift
      [[ "$#" -gt 0 ]] || { echo "--commit requires a Git ref." >&2; exit 64; }
      commit_ref="$1"
      ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

cd "${root}"

config_file="${PSR_SYNC_CONFIG_FILE:-${root}/.psr-sync.env}"
if [[ -f "${config_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${config_file}"
  set +a
fi

state_dir="${PSR_SYNC_STATE_DIR:-${root}/.sync}"
release_dir="${PSR_RELEASE_ARCHIVE_DIR:-${state_dir}/releases}"

targets=","
normalized_targets=""
IFS=',' read -r -a configured_targets <<< "${PSR_SYNC_TARGETS:-cloudflare}"
for configured_target in "${configured_targets[@]}"; do
  target="${configured_target//[[:space:]]/}"
  [[ -n "${target}" ]] || continue
  case "${target}" in
    cloudflare|supabase|aws) ;;
    *) echo "Unsupported PSR sync target: ${target}" >&2; exit 78 ;;
  esac
  if [[ "${targets}" != *",${target},"* ]]; then
    targets+="${target},"
    normalized_targets+="${normalized_targets:+,}${target}"
  fi
done

[[ -n "${normalized_targets}" ]] || {
  echo "PSR_SYNC_TARGETS must include cloudflare, supabase, or aws." >&2
  exit 78
}

has_target() {
  [[ "${targets}" == *",$1,"* ]]
}

git rev-parse --verify HEAD >/dev/null 2>&1 || {
  echo "Create the first Git commit before synchronizing platforms." >&2
  exit 65
}

commit="$(git rev-parse --verify "${commit_ref:-HEAD}^{commit}")"
head_commit="$(git rev-parse HEAD)"
short_commit="$(git rev-parse --short=12 "${commit}^{commit}")"

[[ "${commit}" == "${head_commit}" ]] || {
  echo "The requested release commit must be checked out before synchronization." >&2
  exit 65
}

if [[ "${mode}" == "apply" ]] && [[ -n "$(git status --porcelain)" ]]; then
  echo "Apply mode requires a clean Git worktree so every platform receives the same commit." >&2
  exit 65
fi

if [[ "${skip_tests}" == "0" ]] || has_target cloudflare; then
  if [[ ! -x "${root}/node_modules/.bin/wrangler" ]]; then
    echo "Installing locked dependencies with npm ci..."
    npm ci
  fi
fi

wrangler="${root}/node_modules/.bin/wrangler"

if has_target cloudflare; then
  "${wrangler}" whoami >/dev/null
fi

if has_target supabase; then
  command -v supabase >/dev/null 2>&1 || {
    echo "Supabase CLI is required for the supabase target." >&2
    exit 69
  }
  # Release commands must not fail while waiting for optional telemetry.
  export SUPABASE_TELEMETRY_DISABLED="${SUPABASE_TELEMETRY_DISABLED:-1}"
  [[ -n "${SUPABASE_PROJECT_REF:-}" ]] || {
    echo "SUPABASE_PROJECT_REF is required for the supabase target." >&2
    exit 78
  }
  [[ -n "${SUPABASE_PROJECT_NAME:-}" ]] || {
    echo "SUPABASE_PROJECT_NAME is required as a wrong-project safety check." >&2
    exit 78
  }

  if ! projects_json="$(supabase projects list --output json 2>/dev/null)"; then
    echo "Unable to list projects with the authenticated Supabase CLI." >&2
    exit 69
  fi
  project_details="$(printf '%s' "${projects_json}" | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      const ref = process.argv[1];
      const projects = JSON.parse(input);
      const project = projects.find((item) => item.ref === ref || item.id === ref);
      if (!project) process.exit(2);
      process.stdout.write(`${project.name}\t${project.status || ""}`);
    });
  ' "${SUPABASE_PROJECT_REF}")" || {
    echo "SUPABASE_PROJECT_REF is not accessible to the authenticated Supabase CLI." >&2
    exit 78
  }
  IFS=$'\t' read -r actual_project_name actual_project_status <<< "${project_details}"
  [[ "${actual_project_name}" == "${SUPABASE_PROJECT_NAME}" ]] || {
    echo "Supabase project mismatch: expected '${SUPABASE_PROJECT_NAME}', found '${actual_project_name}'." >&2
    exit 78
  }
  [[ "${actual_project_status}" == "ACTIVE_HEALTHY" ]] || {
    echo "Supabase project '${actual_project_name}' is not ACTIVE_HEALTHY." >&2
    exit 69
  }

  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]] && command -v security >/dev/null 2>&1; then
    keychain_service="${SUPABASE_DB_PASSWORD_KEYCHAIN_SERVICE:-psrhomes.supabase.db-password}"
    SUPABASE_DB_PASSWORD="$(security find-generic-password -a "${USER}" -s "${keychain_service}" -w 2>/dev/null || true)"
  fi
  [[ -n "${SUPABASE_DB_PASSWORD:-}" ]] || {
    echo "SUPABASE_DB_PASSWORD is required in the environment or macOS Keychain." >&2
    exit 78
  }
  export SUPABASE_DB_PASSWORD
  supabase link --project-ref "${SUPABASE_PROJECT_REF}" --yes >/dev/null

  if has_target cloudflare; then
    worker_secrets="$("${wrangler}" secret list --config wrangler.jsonc --format json)"
    printf '%s' "${worker_secrets}" | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => {
        const names = new Set(JSON.parse(input).map((item) => item.name));
        const missing = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter((name) => !names.has(name));
        if (missing.length) {
          console.error(`Cloudflare is missing required Supabase secrets: ${missing.join(", ")}`);
          process.exit(2);
        }
      });
    '
  fi
fi

aws_base=()
if has_target aws; then
  command -v aws >/dev/null 2>&1 || {
    echo "AWS CLI is required for the aws target." >&2
    exit 69
  }
  [[ -n "${AWS_S3_BUCKET:-}" ]] || {
    echo "AWS_S3_BUCKET is required for the aws target." >&2
    exit 78
  }
  aws_base=(aws)
  [[ -n "${AWS_PROFILE:-}" ]] && aws_base+=(--profile "${AWS_PROFILE}")
  [[ -n "${AWS_REGION:-}" ]] && aws_base+=(--region "${AWS_REGION}")
  "${aws_base[@]}" sts get-caller-identity >/dev/null
  "${aws_base[@]}" s3api head-bucket --bucket "${AWS_S3_BUCKET}" >/dev/null
fi

if [[ "${skip_tests}" == "0" ]]; then
  npm test
elif has_target cloudflare; then
  npm run build
fi

if [[ "${mode}" == "dry-run" ]]; then
  if has_target cloudflare; then
    "${wrangler}" d1 migrations list cba-property-db --remote --config wrangler.jsonc
    "${wrangler}" deploy --config wrangler.jsonc --dry-run
  fi
  if has_target supabase; then
    supabase db push --linked --include-all --dry-run --yes
  fi
  if has_target aws; then
    echo "AWS preflight passed for s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX:-psrhomes}/"
  fi
  echo "Dry run passed for PSR commit ${commit}. No platform was changed."
  exit 0
fi

mkdir -p "${release_dir}"
"${root}/scripts/create-release-archive.sh" \
  --commit "${commit}" \
  --output-dir "${release_dir}" >/dev/null
archive="${release_dir}/psrhomes-${short_commit}.tar.gz"
manifest="${release_dir}/psrhomes-${short_commit}.json"

if has_target aws; then
  prefix="${AWS_S3_PREFIX:-psrhomes}"
  "${aws_base[@]}" s3 cp "${archive}" "s3://${AWS_S3_BUCKET}/${prefix}/releases/$(basename "${archive}")" --only-show-errors
  "${aws_base[@]}" s3 cp "${manifest}" "s3://${AWS_S3_BUCKET}/${prefix}/releases/$(basename "${manifest}")" --only-show-errors
  "${aws_base[@]}" s3 cp "${archive}" "s3://${AWS_S3_BUCKET}/${prefix}/latest/psrhomes.tar.gz" --only-show-errors
  "${aws_base[@]}" s3 cp "${manifest}" "s3://${AWS_S3_BUCKET}/${prefix}/latest/manifest.json" --only-show-errors
fi

if has_target supabase; then
  supabase db push --linked --include-all --yes
fi

if has_target cloudflare; then
  "${wrangler}" d1 migrations apply cba-property-db --remote --config wrangler.jsonc
  "${wrangler}" deploy \
    --config wrangler.jsonc \
    --message "PSR release ${commit}"

  IFS=',' read -r -a healthcheck_urls <<< "${PSR_HEALTHCHECK_URLS:-https://psrhomes.ae/}"
  for configured_url in "${healthcheck_urls[@]}"; do
    healthcheck_url="${configured_url//[[:space:]]/}"
    [[ -n "${healthcheck_url}" ]] || continue
    curl --fail --silent --show-error --location --max-time 30 "${healthcheck_url}" >/dev/null
    echo "Health check passed: ${healthcheck_url}"
  done
fi

mkdir -p "${state_dir}"
node --input-type=module - \
  "${state_dir}/last-success.json" \
  "${commit}" \
  "${normalized_targets}" \
  "${SUPABASE_PROJECT_REF:-}" <<'NODE'
import { rename, writeFile } from "node:fs/promises";

const [, , path, commit, targets, supabaseProjectRef] = process.argv;
const temporaryPath = `${path}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify({
  application: "psrhomes.ae",
  commit,
  targets: targets.split(",").filter(Boolean),
  supabaseProjectRef: supabaseProjectRef || null,
  completedAt: new Date().toISOString(),
  status: "synchronized",
}, null, 2)}\n`);
await rename(temporaryPath, path);
NODE

echo "Synchronized PSR commit ${commit} to ${normalized_targets}."
