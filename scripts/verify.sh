#!/usr/bin/env bash
# The whole set CI requires before merge, run locally in one go: `npm run verify`.
# Stops at the first failure and prints how long each step took. Starts the dev
# Postgres; the smoke steps use fixed ports, so one run at a time per machine.
set -euo pipefail
cd "$(dirname "$0")/.."

source scripts/lib/services.sh
ensure_services

steps=(
    "./scripts/check-boundaries.sh"
    "./scripts/check-bare-catch.sh"
    "./scripts/check-env-deploy-sync.sh"
    "composer audit --locked --no-interaction --abandoned=ignore"
    "npm audit --audit-level=high --omit=dev"
    "php artisan wayfinder:generate --with-form --quiet"
    "npm run format:check"
    "npm run types:check"
    "npm run lint:check"
    "npm test"
    "npm run test:rules"
    "npm run test:scripts"
    "node scripts/release.mjs check"
    "vendor/bin/pint --test"
    "vendor/bin/phpstan analyse --no-progress --memory-limit=1G"
    "node scripts/check-smoke-routes.mjs"
    "npm run smoke"
    "npx playwright test -c scripts/smoke/loadmore.config.mjs"
    "php artisan test"
)

total_start=$SECONDS
for step in "${steps[@]}"; do
    start=$SECONDS
    printf '\n==> %s\n' "$step"
    if ! $step; then
        printf '\nverify: FAILED at `%s` after %ss\n' "$step" "$((SECONDS - total_start))" >&2
        exit 1
    fi
    printf '    %ss\n' "$((SECONDS - start))"
done
printf '\nverify: all %s steps passed in %ss\n' "${#steps[@]}" "$((SECONDS - total_start))"
