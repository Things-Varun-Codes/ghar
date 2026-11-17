#!/usr/bin/env bash
# Run inside a worktree before removing it: drops the PHPUnit database that
# tests/bootstrap.php created for it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/services.sh

[ -n "$(main_checkout)" ] || { echo "error: this is the main checkout, not a worktree." >&2; exit 1; }

# The same name tests/bootstrap.php derives.
slug="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g' | cut -c1-40)"
host="$(sed -n 's/^DB_HOST=//p' .env 2>/dev/null | tail -n 1)"
port="$(sed -n 's/^DB_PORT=//p' .env 2>/dev/null | tail -n 1)"

GHAR_PG_DSN="pgsql:host=${host:-127.0.0.1};port=${port:-5432};dbname=postgres" GHAR_DB="ghar_test_$slug" php -r '
  try {
      $pdo = new PDO(getenv("GHAR_PG_DSN"), "ghar", "ghar", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]);
  } catch (PDOException) {
      exit(0); // Postgres is down: nothing to drop now.
  }
  $pdo->exec("drop database if exists \"".getenv("GHAR_DB")."\"");
  echo "Dropped ".getenv("GHAR_DB").".\n";
'
