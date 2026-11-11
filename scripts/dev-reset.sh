#!/usr/bin/env bash
#
# Rebuild the local database with the sample household. Keeps .env and
# dependencies; `npm run dev-setup` does those.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

[ -f .env ] || { echo "error: no .env yet. Run \`npm run dev-setup\` first." >&2; exit 1; }

value() { sed -n "s/^$1=//p" .env | tail -n 1; }

# migrate:fresh drops every table, so make sure this is the local database.
[ "$(value APP_ENV)" = "local" ] || { echo "error: APP_ENV is not local; refusing to reset this database." >&2; exit 1; }
case "$(value DB_HOST)" in
  127.0.0.1|localhost) ;;
  *) echo "error: DB_HOST is not local; refusing to reset this database." >&2; exit 1 ;;
esac

docker compose -f docker-compose.override.yml up -d --wait postgres mailpit

php artisan config:clear --quiet
php artisan migrate:fresh --seed --force

node --input-type=module -e "
import { printDevCredentials } from './scripts/lib/dev-data.mjs';
printDevCredentials();
"
