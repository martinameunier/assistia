#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SITE_DIR="${DOC_SITE_DIR:-$ROOT_DIR/site-documentaire}"
TARGET="${DOC_DEPLOY_TARGET:-debian@91.134.140.29}"
PORT="${DOC_DEPLOY_PORT:-8722}"
REMOTE_PARENT="${DOC_REMOTE_PARENT:-/home/debian/IA}"
REMOTE_SITE_NAME="${DOC_REMOTE_SITE_NAME:-site-documentaire}"
COMPOSE_CMD="${DOC_COMPOSE_CMD:-docker compose}"
COMPOSE_UP_ARGS="${DOC_COMPOSE_UP_ARGS:--d --build}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  npm run documentation:deploy
  DOC_DEPLOY_TARGET=user@example.com DOC_DEPLOY_PORT=2222 npm run documentation:deploy

Options:
  --dry-run                    print the sftp batch and ssh commands without running them

Environment:
  DOC_DEPLOY_TARGET            ssh/sftp target, for example user@example.com
  DOC_DEPLOY_PORT              ssh/sftp port, default: 22
  DOC_REMOTE_PARENT            remote parent folder, default: /opt/assistia
  DOC_REMOTE_SITE_NAME         remote site folder name, default: site-documentaire
  DOC_COMPOSE_CMD              remote compose command, default: docker-compose
  DOC_COMPOSE_UP_ARGS          default: -d --build

Notes:
  This script is intentionally macOS-only because it uses your Mac SSH setup.
  If you want the exact command "docker-compose up -d", set:
    DOC_COMPOSE_UP_ARGS="-d"
EOF
}

while (($#)); do
  case "$1" in
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
      echo "Run: $0 --help" >&2
      exit 2
      ;;
  esac
done

log() {
  printf '\n==> %s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

sftp_quote() {
  local value="${1//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'

  if [[ "$DRY_RUN" != "1" ]]; then
    "$@"
  fi
}

run_sftp_upload() {
  local upload_name="$1"
  local batch_file
  batch_file="$(mktemp "${TMPDIR:-/tmp}/assistia-sftp.XXXXXX")"

  {
    printf -- '-mkdir %s\n' "$(sftp_quote "$REMOTE_PARENT")"
    printf 'cd %s\n' "$(sftp_quote "$REMOTE_PARENT")"
    printf 'put -r %s %s\n' "$(sftp_quote "$SITE_DIR")" "$(sftp_quote "$upload_name")"
  } > "$batch_file"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "SFTP batch"
    cat "$batch_file"
  fi

  run sftp -P "$PORT" -b "$batch_file" "$TARGET"
  rm -f "$batch_file"
}

run_remote_restart() {
  local upload_name="$1"
  local previous_name="$REMOTE_SITE_NAME.previous"
  local remote_parent_q
  local remote_site_q
  local upload_q
  local previous_q

  remote_parent_q="$(shell_quote "$REMOTE_PARENT")"
  remote_site_q="$(shell_quote "$REMOTE_SITE_NAME")"
  upload_q="$(shell_quote "$upload_name")"
  previous_q="$(shell_quote "$previous_name")"

  local remote_script
  remote_script=$(cat <<EOF
set -e
cd $remote_parent_q
upload_dir=$upload_q
site_name=$remote_site_q
if [ -f "\$upload_dir/docker-compose.yml" ]; then
  prepared_dir="\$upload_dir"
elif [ -f "\$upload_dir/\$site_name/docker-compose.yml" ]; then
  prepared_dir="\$upload_dir/\$site_name"
else
  echo "Uploaded documentation folder does not contain docker-compose.yml" >&2
  exit 1
fi
rm -rf $previous_q
if [ -d $remote_site_q ]; then
  mv $remote_site_q $previous_q
fi
mv "\$prepared_dir" $remote_site_q
if [ "\$prepared_dir" != "\$upload_dir" ]; then
  rm -rf "\$upload_dir"
fi
cd $remote_site_q
$COMPOSE_CMD down
$COMPOSE_CMD up $COMPOSE_UP_ARGS
EOF
)

  if [[ "$DRY_RUN" == "1" ]]; then
    log "Remote SSH script"
    printf '%s\n' "$remote_script"
  fi

  run ssh -p "$PORT" "$TARGET" "$remote_script"
}

[[ "$(uname -s)" == "Darwin" ]] || die "This documentation deploy script must be run from your Mac."
[[ -n "$TARGET" ]] || die "Set DOC_DEPLOY_TARGET or DEPLOY_TARGET before running this script."
[[ -d "$SITE_DIR" ]] || die "Documentation folder not found: $SITE_DIR"
[[ -f "$SITE_DIR/docker-compose.yml" ]] || die "Missing docker-compose.yml in: $SITE_DIR"

need_command sftp
need_command ssh

UPLOAD_NAME=".$REMOTE_SITE_NAME-upload-$(date +%Y%m%d%H%M%S)-$$"

log "Uploading $SITE_DIR to $TARGET:$REMOTE_PARENT/$UPLOAD_NAME with sftp"
run_sftp_upload "$UPLOAD_NAME"

log "Restarting remote documentation compose stack"
run_remote_restart "$UPLOAD_NAME"

log "Documentation deployment complete"
