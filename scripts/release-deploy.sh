#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SITE_DIR="${SITE_DIR:-$ROOT_DIR/site-documentaire}"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/dist-release}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$RELEASE_DIR/artifacts}"
REQUESTED_PLATFORMS="${REQUESTED_PLATFORMS:-current}"

COMMAND="${1:-all}"
case "$COMMAND" in
  all|build|deploy|check|help|-h|--help)
    shift || true
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    echo "Run: $0 help" >&2
    exit 2
    ;;
esac

SKIP_BUILD=0
SKIP_DEPLOY=0
DEPLOY_DOCS=1
DEPLOY_ARTIFACTS=1
DRY_RUN=0
REQUIRE_ALL_PLATFORMS=0

usage() {
  cat <<'EOF'
Usage:
  npm run release              # build current OS, then deploy docs/artifacts
  npm run release:build        # build current OS and collect artifacts
  npm run release:deploy       # deploy existing artifacts and docs
  npm run release:check        # validate compose and local documentation links

Options:
  --platforms LIST             current, all, or comma list: macos,windows,linux
  --skip-build                 with "all", deploy without building
  --skip-deploy                with "all", build without deploying
  --docs-only                  deploy only site-documentaire
  --artifacts-only             deploy only dist-release/artifacts
  --require-all-platforms      fail deploy unless macos/windows/linux artifacts exist
  --dry-run                    print commands without running them

Deploy environment:
  DEPLOY_TARGET                ssh target, for example deploy@example.com
  DEPLOY_HOST                  alternative to DEPLOY_TARGET
  DEPLOY_USER                  optional user when DEPLOY_HOST is used
  DEPLOY_PORT                  ssh port, default: 22
  DEPLOY_SSH_KEY               optional ssh private key path
  DEPLOY_PATH                  remote base path, default: /opt/assistia
  DEPLOY_COMPOSE_CMD           remote compose command, default: docker compose
  DEPLOY_RSYNC_DELETE          set to 1 to delete remote files missing locally
  TAURI_BUILD_ARGS             extra args for "tauri build", for example: --no-sign

Important:
  Tauri desktop bundles are native. Build macOS on macOS, Windows on Windows,
  and Linux on Linux. Run release:build on each OS, bring the artifacts into
  dist-release/artifacts/<platform>, then run release:deploy.
EOF
}

while (($#)); do
  case "$1" in
    --platforms)
      REQUESTED_PLATFORMS="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=1
      shift
      ;;
    --docs-only)
      DEPLOY_DOCS=1
      DEPLOY_ARTIFACTS=0
      shift
      ;;
    --artifacts-only)
      DEPLOY_DOCS=0
      DEPLOY_ARTIFACTS=1
      shift
      ;;
    --require-all-platforms)
      REQUIRE_ALL_PLATFORMS=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run: $0 help" >&2
      exit 2
      ;;
  esac
done

log() {
  printf '\n==> %s\n' "$*"
}

warn() {
  printf 'Warning: %s\n' "$*" >&2
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'

  if [[ "$DRY_RUN" != "1" ]]; then
    "$@"
  fi
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

detect_platform() {
  case "$(uname -s)" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      echo "linux"
      ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
      echo "windows"
      ;;
    *)
      die "Unsupported host OS: $(uname -s)"
      ;;
  esac
}

platform_list() {
  case "$REQUESTED_PLATFORMS" in
    current|"")
      echo "$CURRENT_PLATFORM"
      ;;
    all)
      echo "macos windows linux"
      ;;
    *)
      echo "${REQUESTED_PLATFORMS//,/ }"
      ;;
  esac
}

platform_requested_here() {
  local wanted
  for wanted in $(platform_list); do
    if [[ "$wanted" == "$CURRENT_PLATFORM" ]]; then
      return 0
    fi
  done
  return 1
}

remote_quote() {
  printf '%q' "$1"
}

package_version() {
  node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version"
}

build_current_platform() {
  need_command node
  need_command npm

  if ! platform_requested_here; then
    warn "Current host is $CURRENT_PLATFORM, not in requested platforms: $(platform_list)"
    return 0
  fi

  log "Building Assistia for $CURRENT_PLATFORM"

  if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    log "Installing npm dependencies"
    run npm ci
  fi

  if [[ -n "${TAURI_BUILD_ARGS:-}" ]]; then
    local extra_args=()
    # shellcheck disable=SC2206
    extra_args=(${TAURI_BUILD_ARGS})
    run npm run tauri -- build --ci "${extra_args[@]}"
  else
    run npm run tauri -- build --ci
  fi
  collect_artifacts "$CURRENT_PLATFORM"

  for requested in $(platform_list); do
    if [[ "$requested" != "$CURRENT_PLATFORM" ]]; then
      warn "Build $requested on a native $requested host, then copy artifacts into $ARTIFACTS_DIR/$requested"
    fi
  done
}

collect_artifacts() {
  local platform="$1"
  local bundle_dir="$ROOT_DIR/src-tauri/target/release/bundle"
  local destination="$ARTIFACTS_DIR/$platform"
  local found=0

  mkdir -p "$destination"

  if [[ ! -d "$bundle_dir" ]]; then
    warn "Bundle directory not found: $bundle_dir"
    return 0
  fi

  log "Collecting installer artifacts into ${destination#$ROOT_DIR/}"

  while IFS= read -r -d '' artifact; do
    found=1
    run cp -p "$artifact" "$destination/"
  done < <(
    find "$bundle_dir" -type f \
      \( -name '*.dmg' \
      -o -name '*.msi' \
      -o -name '*.exe' \
      -o -name '*.AppImage' \
      -o -name '*.deb' \
      -o -name '*.rpm' \
      -o -name '*.app.tar.gz' \
      -o -name '*.app.tar.gz.sig' \
      -o -name '*.zip' \) \
      -print0
  )

  if [[ "$found" != "1" ]]; then
    warn "No installer artifact found in $bundle_dir"
  fi
}

check_artifacts() {
  local missing=()
  local platform

  for platform in macos windows linux; do
    if [[ ! -d "$ARTIFACTS_DIR/$platform" ]] || [[ -z "$(find "$ARTIFACTS_DIR/$platform" -type f -print -quit 2>/dev/null)" ]]; then
      missing+=("$platform")
    fi
  done

  if ((${#missing[@]})); then
    if [[ "$REQUIRE_ALL_PLATFORMS" == "1" ]]; then
      die "Missing artifacts for: ${missing[*]}"
    fi
    warn "Missing artifacts for: ${missing[*]}"
  fi
}

check_site() {
  need_command node

  log "Checking documentation links"
  SITE_DIR="$SITE_DIR" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.env.SITE_DIR);
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}

walk(root);

const attrRe = /(?:href|src|data-diagram)=["']([^"']+)["']/g;
const missing = [];

function localTargets(file, clean) {
  if (clean.startsWith('/')) {
    const absolutePath = clean.slice(1);

    return [
      path.resolve(root, 'documentation', absolutePath),
      path.resolve(root, absolutePath),
    ];
  }

  return [path.resolve(path.dirname(file), clean)];
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(attrRe)) {
    const target = match[1].trim();
    if (!target || target.startsWith('#')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//') || target.startsWith('data:')) continue;

    const clean = target.split('#')[0].split('?')[0];
    if (!clean) continue;

    if (!localTargets(file, clean).some((resolved) => fs.existsSync(resolved))) {
      missing.push(`${path.relative(root, file)} -> ${target}`);
    }
  }
}

if (missing.length) {
  console.error(`Missing local targets:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML files; all local targets exist.`);
NODE

  if command -v docker >/dev/null 2>&1; then
    log "Checking documentation docker compose"
    run docker compose -f "$SITE_DIR/docker-compose.yml" config >/dev/null
  else
    warn "Docker is not available locally; compose config check skipped"
  fi
}

resolve_deploy_target() {
  if [[ -n "${DEPLOY_TARGET:-}" ]]; then
    echo "$DEPLOY_TARGET"
    return
  fi

  [[ -n "${DEPLOY_HOST:-}" ]] || die "Set DEPLOY_TARGET or DEPLOY_HOST before deploying"

  if [[ -n "${DEPLOY_USER:-}" ]]; then
    echo "$DEPLOY_USER@$DEPLOY_HOST"
  else
    echo "$DEPLOY_HOST"
  fi
}

deploy_release() {
  need_command ssh
  need_command rsync

  check_artifacts

  local target
  target="$(resolve_deploy_target)"

  local remote_base="${DEPLOY_PATH:-/opt/assistia}"
  local remote_site="$remote_base/site-documentaire"
  local remote_artifacts="$remote_base/artifacts"
  local compose_cmd="${DEPLOY_COMPOSE_CMD:-docker compose}"
  local rsync_args=(-az)

  if [[ "${DEPLOY_RSYNC_DELETE:-0}" == "1" ]]; then
    rsync_args+=(--delete)
  fi

  local ssh_base=(ssh -p "${DEPLOY_PORT:-22}")
  if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
    ssh_base+=(-i "$DEPLOY_SSH_KEY")
  fi
  if [[ -n "${DEPLOY_SSH_OPTS:-}" ]]; then
    # shellcheck disable=SC2206
    local extra_ssh_opts=(${DEPLOY_SSH_OPTS})
    ssh_base+=("${extra_ssh_opts[@]}")
  fi

  local rsync_rsh
  rsync_rsh="$(printf '%q ' "${ssh_base[@]}")"

  log "Preparing remote directories on $target"
  run "${ssh_base[@]}" "$target" "mkdir -p $(remote_quote "$remote_site") $(remote_quote "$remote_artifacts")"

  if [[ "$DEPLOY_DOCS" == "1" ]]; then
    log "Deploying documentation site"
    run rsync "${rsync_args[@]}" -e "$rsync_rsh" "$SITE_DIR/" "$target:$remote_site/"
  fi

  if [[ "$DEPLOY_ARTIFACTS" == "1" ]]; then
    if [[ -d "$ARTIFACTS_DIR" ]]; then
      log "Deploying release artifacts"
      run rsync "${rsync_args[@]}" -e "$rsync_rsh" "$ARTIFACTS_DIR/" "$target:$remote_artifacts/"
    else
      warn "Artifacts directory does not exist: $ARTIFACTS_DIR"
    fi
  fi

  if [[ "$DEPLOY_DOCS" == "1" ]]; then
    log "Rebuilding and restarting remote documentation container"
    run "${ssh_base[@]}" "$target" "cd $(remote_quote "$remote_site") && $compose_cmd up -d --build --force-recreate --remove-orphans"
  fi
}

CURRENT_PLATFORM="$(detect_platform)"

case "$COMMAND" in
  help|-h|--help)
    usage
    ;;
  check)
    check_site
    check_artifacts
    ;;
  build)
    build_current_platform
    check_artifacts
    ;;
  deploy)
    check_site
    deploy_release
    ;;
  all)
    if [[ "$SKIP_BUILD" != "1" ]]; then
      build_current_platform
    fi
    if [[ "$SKIP_DEPLOY" != "1" ]]; then
      check_site
      deploy_release
    fi
    ;;
esac
