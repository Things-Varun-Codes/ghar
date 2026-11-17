#!/usr/bin/env bash
# Remembers the migration files as they were when the local database was last
# built, so `npm run dev-sync` can tell when one that already ran has changed.
#
#   migration-stamp.sh write     record the files as they are now
#   migration-stamp.sh changed   list recorded files that differ or are gone
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

stamp="storage/framework/cache/data/dev-migrations.sha"
current() { find database/migrations -name '*.php' -type f -print0 | sort -z | xargs -0 shasum; }

case "${1:-}" in
  write) current > "$stamp" ;;
  changed)
    [ -f "$stamp" ] || exit 0
    now="$(current)"
    while read -r sum file; do
      grep -qxF "$sum  $file" <<<"$now" || echo "$file"
    done < "$stamp"
    ;;
  *) echo "usage: migration-stamp.sh write|changed" >&2; exit 2 ;;
esac
