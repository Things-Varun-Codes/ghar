#!/usr/bin/env bash
#
# One command from a fresh clone to a seeded local environment:
#
#   npm run dev-setup            # asks before changing an existing .env
#   npm run dev-setup -- --yes   # applies the local values to .env without asking
#
# Safe to re-run. It rebuilds the local `ghar` database every time, so anything
# you added by hand there is gone (that is the point: every run ends with the
# same data). `npm run dev-reset` does only that last part.
#
# Ports: set GHAR_DB_PORT, GHAR_MAILPIT_SMTP_PORT or GHAR_MAILPIT_UI_PORT if the
# defaults (5432, 1025, 8025) are taken.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=1 ;;
    *) echo "Unknown option: $arg (the only option is --yes)" >&2; exit 2 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }
die() { printf '\nerror: %s\n' "$1" >&2; exit 1; }

# ─── Prerequisites ──────────────────────────────────────────────────────
step "Checking prerequisites"

command -v php >/dev/null || die "PHP is not installed. Ghar needs PHP 8.4 or newer."
php -r 'exit(PHP_VERSION_ID >= 80400 ? 0 : 1);' \
  || die "PHP $(php -r 'echo PHP_VERSION;') is too old. Ghar needs PHP 8.4 or newer."

missing_ext="$(php -r 'echo implode(" ", array_filter(["pdo_pgsql","mbstring","bcmath","intl","zip","gd","exif"], fn ($e) => ! extension_loaded($e)));')"
[ -z "$missing_ext" ] || die "Missing PHP extensions: $missing_ext"
php -r 'exit(function_exists("imagewebp") ? 0 : 1);' || die "PHP's gd extension was built without WebP support."

command -v composer >/dev/null || die "Composer is not installed: https://getcomposer.org/download/"
command -v node >/dev/null || die "Node is not installed. Ghar needs Node 22 or newer."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] \
  || die "Node $(node -v) is too old. Ghar needs Node 22 or newer."
command -v npm >/dev/null || die "npm is not installed."
command -v docker >/dev/null || die "Docker is not installed. It runs the local Postgres and Mailpit."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is not installed."
docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start it and re-run."

echo "    all present"

# ─── .env ───────────────────────────────────────────────────────────────
# set_env KEY VALUE replaces a `KEY=` line, or appends one. No `sed -i`, whose
# flags differ between macOS and Linux.
set_env() {
  local tmp
  tmp="$(mktemp)"
  if grep -q "^$1=" .env; then
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in
        "$1="*) printf '%s\n' "$1=$2" ;;
        *) printf '%s\n' "$line" ;;
      esac
    done < .env > "$tmp"
    mv "$tmp" .env
  else
    rm -f "$tmp"
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

get_env() { [ -f .env ] && sed -n "s/^$1=//p" .env | tail -n 1 || true; }

# An override given once is remembered in .env (below), where Compose reads it.
DB_PORT_WANTED="${GHAR_DB_PORT:-$(get_env GHAR_DB_PORT)}"
DB_PORT_WANTED="${DB_PORT_WANTED:-5432}"
SMTP_PORT_WANTED="${GHAR_MAILPIT_SMTP_PORT:-$(get_env GHAR_MAILPIT_SMTP_PORT)}"
SMTP_PORT_WANTED="${SMTP_PORT_WANTED:-1025}"

# What the rest of this script, the seeder and `npm run smoke-mcp` assume.
LOCAL_VALUES=(
  "APP_ENV=local"
  "APP_DEBUG=true"
  "APP_URL=http://127.0.0.1:8000"
  "DB_CONNECTION=pgsql"
  "DB_HOST=127.0.0.1"
  "DB_PORT=$DB_PORT_WANTED"
  "DB_DATABASE=ghar"
  "DB_USERNAME=ghar"
  "DB_PASSWORD=ghar"
  "MEDIA_DISK=local"
  "QUEUE_CONNECTION=sync"
  "MAIL_MAILER=smtp"
  "MAIL_HOST=127.0.0.1"
  "MAIL_PORT=$SMTP_PORT_WANTED"
  "BOUQUET_IMAGE_PROVIDER=fake"
)

step "Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  for pair in "${LOCAL_VALUES[@]}"; do set_env "${pair%%=*}" "${pair#*=}"; done
  echo "    created from .env.example"
else
  differing=()
  for pair in "${LOCAL_VALUES[@]}"; do
    [ "$(get_env "${pair%%=*}")" = "${pair#*=}" ] || differing+=("$pair")
  done

  if [ "${#differing[@]}" -eq 0 ]; then
    echo "    existing .env already has the local values"
  else
    echo "    Your .env differs from the local values:"
    for pair in "${differing[@]}"; do
      printf '      %-24s has "%s", wants "%s"\n' "${pair%%=*}" "$(get_env "${pair%%=*}")" "${pair#*=}"
    done

    if [ "$ASSUME_YES" -eq 0 ]; then
      [ -t 0 ] || die "Not changing your .env without permission. Re-run with --yes, or edit it yourself."
      read -r -p "    Apply them? A copy is kept as .env.backup. [y/N] " reply
      case "$reply" in
        y|Y|yes) ;;
        *) die "Left .env alone. Set the values above yourself, then re-run." ;;
      esac
    fi

    cp .env .env.backup
    for pair in "${differing[@]}"; do set_env "${pair%%=*}" "${pair#*=}"; done
    echo "    applied (previous file saved as .env.backup)"
  fi
fi

for var in GHAR_DB_PORT GHAR_MAILPIT_SMTP_PORT GHAR_MAILPIT_UI_PORT; do
  [ -z "${!var:-}" ] || set_env "$var" "${!var}"
done

# ─── Postgres and Mailpit ───────────────────────────────────────────────
step "Starting Postgres and Mailpit"
docker compose -f docker-compose.override.yml up -d --wait postgres mailpit \
  || die "Could not start the containers. If a port is taken, set GHAR_DB_PORT, GHAR_MAILPIT_SMTP_PORT or GHAR_MAILPIT_UI_PORT and re-run."

# ─── Dependencies ───────────────────────────────────────────────────────
step "Installing PHP dependencies"
composer install --no-interaction --no-progress

step "Installing JS dependencies"
npm ci --no-audit --no-fund

# .npmrc sets ignore-scripts, so neither of these runs during `npm ci`.
if [ -d .git ]; then
  step "Installing git hooks"
  npx lefthook install
fi

step "Installing Playwright Chromium"
npx playwright install chromium

# ─── Keys ───────────────────────────────────────────────────────────────
php artisan config:clear --quiet

if [ -z "$(get_env APP_KEY)" ]; then
  step "Generating APP_KEY"
  php artisan key:generate --ansi
fi

if [ -z "$(get_env VAPID_PUBLIC_KEY)" ]; then
  step "Generating VAPID keys"
  # Local push is optional, and some OpenSSL builds can't generate EC keys.
  php artisan webpush:vapid --ansi || echo "    skipped: push notifications won't work locally"
fi

if [ -z "$(get_env VAPID_SUBJECT)" ]; then
  set_env VAPID_SUBJECT "mailto:dev@example.test"
fi

# ─── App ────────────────────────────────────────────────────────────────
step "Generating Wayfinder routes"
php artisan wayfinder:generate --with-form --quiet


step "Seeding the sample household"
php artisan migrate:fresh --seed --force

node --input-type=module -e "
import { printDevCredentials } from './scripts/lib/dev-data.mjs';
console.log('\nReady.');
printDevCredentials();
console.log('  Run:      composer dev        then open http://127.0.0.1:8000');
console.log('  Or:       npm run smoke-mcp   (built bundle, for browser testing)');
console.log('  Mail:     http://127.0.0.1:$(get_env GHAR_MAILPIT_UI_PORT | grep . || echo 8025)');
console.log('  Re-seed:  npm run dev-reset');
"
