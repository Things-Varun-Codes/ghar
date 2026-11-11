#!/usr/bin/env bash
# Fails if the shell imports a mini app, one mini app imports another, a mini
# app's components read --shell-* directly, or a mini app's theme defines it.

set -uo pipefail

failed=0

report() {
    if [ -n "$2" ]; then
        echo "ERROR: $1:" >&2
        echo "$2" | sed 's/^/  - /' >&2
        failed=1
    fi
}

report 'the shell imports a mini app' \
    "$(grep -rnE '^use App\\MiniApps\\' app/Shell || true)"
report 'the shell JS imports a mini app' \
    "$(grep -rnE "from '@/MiniApps/" resources/js/Shell || true)"

for dir in app/MiniApps/*/; do
    app=$(basename "$dir")
    report "$app imports another mini app" \
        "$(grep -rnE '^use App\\MiniApps\\' "$dir" | grep -v "App\\\\MiniApps\\\\$app\\\\" || true)"
done

for dir in resources/js/MiniApps/*/; do
    app=$(basename "$dir")
    report "$app JS imports another mini app" \
        "$(grep -rnE "from '@/MiniApps/" "$dir" | grep -v "@/MiniApps/$app/" || true)"
done

report 'mini-app components read --shell-* (alias it to --<app>-* in the theme)' \
    "$(grep -rn 'var(--shell-' resources/js/MiniApps app/MiniApps || true)"
report 'mini-app themes define --shell-*' \
    "$(grep -nE '^\s*--shell-[a-z-]+\s*:' resources/css/themes/*.css || true)"

[ "$failed" -eq 0 ] && echo "✓ shell and mini-app boundaries hold"
exit "$failed"
