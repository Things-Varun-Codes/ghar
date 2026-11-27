#!/usr/bin/env bash
# Run inside a worktree before removing it: drops the databases made for it
# (tests/bootstrap.php, ghar-setup, the smoke runs), and deletes the branch once it is merged.
# No `set -e`: a tool that runs this on archive would report any hiccup as a failed cleanup.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/services.sh

[ -n "$(main_checkout)" ] || { echo "error: this is the main checkout, not a worktree." >&2; exit 1; }

# The same names tests/bootstrap.php and a machine's own `ghar-setup` derive.
slug="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g' | cut -c1-40)"
wt_slug="$(printf '%s' "$(basename "$PWD")" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')"
dbs="ghar_test_$slug ghar_wt_$wt_slug ghar_test_wt_$wt_slug"
# The smoke runs name theirs after the port offset (scripts/lib/checkout-port.mjs).
server_port="$(get_env SERVER_PORT)"
if [[ "$server_port" =~ ^80(0[1-9]|[1-9][0-9])$ ]]; then
  dbs="$dbs ghar_smoke_$((10#${server_port#80})) ghar_smoke_loadmore_$((10#${server_port#80}))"
fi
host="$(get_env DB_HOST)"
port="$(get_env DB_PORT)"

GHAR_PG_DSN="pgsql:host=${host:-127.0.0.1};port=${port:-5432};dbname=postgres" GHAR_DBS="$dbs" php -r '
  try {
      $pdo = new PDO(getenv("GHAR_PG_DSN"), "ghar", "ghar", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]);
  } catch (PDOException) {
      exit(0); // Postgres is down: nothing to drop now.
  }
  foreach (explode(" ", getenv("GHAR_DBS")) as $db) {
      $pdo->exec("drop database if exists \"$db\" with (force)");
  }
  echo "Dropped this worktree\x27s databases.\n";
'

# Merged into main here or on origin, plainly or squashed: the branch goes with its worktree.
branch="$(git symbolic-ref --quiet --short HEAD || true)"
if [ -n "$branch" ] && [ "$branch" != main ]; then
  git fetch --quiet origin main 2>/dev/null || true
  for base in main origin/main; do
    git rev-parse --verify --quiet "$base" >/dev/null || continue
    if ! git merge-base --is-ancestor HEAD "$base"; then
      # A squash merge lands the branch's whole diff as one commit; git cherry finds it by patch.
      mb="$(git merge-base "$base" HEAD)" || continue
      squash="$(git commit-tree 'HEAD^{tree}' -p "$mb" -m squash)" || continue
      [[ "$(git cherry "$base" "$squash")" == -* ]] || continue
    fi
    # Git won't delete a checked-out branch; the worktree is about to go anyway.
    git switch --quiet --detach && git branch --quiet -D "$branch" && echo "Deleted $branch, merged into $base."
    break
  done
fi
exit 0
