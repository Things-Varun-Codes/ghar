#!/usr/bin/env bash
# Fails if the shell names a mini app's slug, a mini app's components read --shell-* directly,
# or a mini app's theme defines it. Imports across the boundary are ESLint's
# import-x/no-restricted-paths (JS) and tools/phpstan/RoomBoundaryRule.php (PHP).

set -uo pipefail

failed=0

report() {
    if [ -n "$2" ]; then
        echo "ERROR: $1:" >&2
        echo "$2" | sed 's/^/  - /' >&2
        failed=1
    fi
}

# A room slug in the shell (`our-shelf`, `data-app="our-…"`, `/apps/our-…`) is a room fact the
# shell should get from the registry or the room itself. The boundary keeps `hour-`/`four-` out.
report 'the shell names a room (take it from the registry, or let the room pass it in)' \
    "$(grep -rnE '(^|[^a-z0-9_-])our-[a-z]' resources/js/Shell app/Shell \
        --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*Test.php' || true)"

report 'mini-app components read --shell-* (alias it to --<app>-* in the theme)' \
    "$(grep -rn 'var(--shell-' resources/js/MiniApps app/MiniApps || true)"
report 'mini-app themes define --shell-*' \
    "$(grep -nE '^\s*--shell-[a-z-]+\s*:' resources/css/themes/*.css || true)"

[ "$failed" -eq 0 ] && echo "✓ shell and mini-app boundaries hold"
exit "$failed"
