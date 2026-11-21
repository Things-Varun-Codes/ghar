#!/usr/bin/env bash
#
# Bring this checkout up to date with the code that is checked out: run it after
# a pull or a branch switch.
#
#   npm run dev-sync     services, dependencies, routes, migrations
#   npm run dev-up       the same, then `composer dev`
#
# It changes no branch and pulls nothing. If a migration that already ran has
# been edited, the local database is rebuilt from the seed, because `migrate`
# would silently skip the edit.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/services.sh

[ -f .env ] || { echo "error: no .env yet. Run \`npm run dev-setup\` first (in a worktree: \`bash scripts/worktree-setup.sh\`)." >&2; exit 1; }

step "Starting Postgres and Mailpit"
ensure_services

if [ ! -d vendor ] || lock_changed composer.lock vendor/.ghar-lock; then
  step "Installing PHP dependencies"
  composer install --no-interaction --no-progress
  record_lock composer.lock vendor/.ghar-lock
fi

if [ ! -d node_modules ] || lock_changed package-lock.json node_modules/.cache/ghar-lock; then
  step "Installing JS dependencies"
  npm ci --no-audit --no-fund
  record_lock package-lock.json node_modules/.cache/ghar-lock
fi

install_hooks

step "Generating Wayfinder routes"
php artisan config:clear --quiet
php artisan wayfinder:generate --with-form --quiet

changed="$(bash scripts/lib/migration-stamp.sh changed)"
if [ -n "$changed" ]; then
  step "Rebuilding the database: a migration that already ran has changed"
  printf '    %s\n' $changed
  bash scripts/dev-reset.sh
else
  step "Running migrations"
  php artisan migrate --force
  bash scripts/lib/migration-stamp.sh write
fi

# The dev log only grows; past a megabyte, keep the recent end of it.
log="storage/logs/laravel.log"
if [ -f "$log" ] && [ "$(wc -c < "$log")" -gt 1000000 ]; then
  tail -n 500 "$log" > "$log.tmp" && mv "$log.tmp" "$log"
fi

printf '\nUp to date.\n'

if [ "${1:-}" = "--serve" ]; then
  exec composer dev
fi
