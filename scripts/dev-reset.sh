#!/usr/bin/env bash
#
# Rebuild the local database with the sample household. Keeps .env and
# dependencies; `npm run dev-setup` does those.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

[ -f .env ] || { echo "error: no .env yet. Run \`npm run dev-setup\` first." >&2; exit 1; }

source scripts/lib/services.sh

# migrate:fresh drops every table, so make sure this is the local database.
[ "$(get_env APP_ENV)" = "local" ] || { echo "error: APP_ENV is not local; refusing to reset this database." >&2; exit 1; }
case "$(get_env DB_HOST)" in
  127.0.0.1|localhost) ;;
  *) echo "error: DB_HOST is not local; refusing to reset this database." >&2; exit 1 ;;
esac

ensure_services

php artisan config:clear --quiet
seed_household

node --input-type=module -e "
import { printDevCredentials } from './scripts/lib/dev-data.mjs';
printDevCredentials();
"
