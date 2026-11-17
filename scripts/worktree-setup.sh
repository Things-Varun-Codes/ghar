#!/usr/bin/env bash
#
# Make a new git worktree ready to work in. Run it once, inside the worktree:
#
#   bash scripts/worktree-setup.sh
#
# It copies `.env` from the main checkout, installs dependencies and generates
# the Wayfinder routes. The worktree shares the main checkout's Postgres and dev
# database; PHPUnit gets a database of its own (tests/bootstrap.php), so test
# runs in two worktrees don't collide. The smoke scripts use fixed ports and
# databases: one run at a time per machine.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/services.sh

step() { printf '\n==> %s\n' "$1"; }

main="$(main_checkout)"
[ -n "$main" ] || { echo "error: this is the main checkout, not a worktree. Use \`npm run dev-setup\`." >&2; exit 1; }

if [ ! -f .env ]; then
  [ -f "$main/.env" ] || { echo "error: $main has no .env. Run \`npm run dev-setup\` there first." >&2; exit 1; }
  step "Copying .env from $main"
  cp "$main/.env" .env
fi

step "Starting Postgres and Mailpit"
ensure_services

step "Installing PHP dependencies"
composer install --no-interaction --no-progress
record_lock composer.lock vendor/.ghar-lock

step "Installing JS dependencies"
npm ci --no-audit --no-fund
record_lock package-lock.json node_modules/.cache/ghar-lock

step "Installing git hooks"
install_hooks

step "Generating Wayfinder routes"
php artisan config:clear --quiet
php artisan wayfinder:generate --with-form --quiet

# PHPUnit renders pages through the built manifest.
step "Building the frontend"
npm run build

printf '\nReady. Tests: php artisan test. The dev database is shared with %s.\n' "$main"
