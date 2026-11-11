#!/usr/bin/env bash
# Fails on an empty-body `catch (\Throwable ...) { }` in app/. Backend silent paths
# must surface through error tracking.

set -euo pipefail

HITS=$(grep -rn -E 'catch *\(\\?Throwable[^)]*\) *\{[[:space:]]*\}' app/ 2>/dev/null || true)

if [ -z "$HITS" ]; then
    echo "✓ no bare-catch sites in app/"
    exit 0
fi

echo "ERROR: empty-body bare-catch sites in app/:" >&2
echo "$HITS" | sed 's/^/  - /' >&2
echo "" >&2
echo "Fix: replace the empty catch with \`catch (\\Throwable \$e) { report(\$e); ... }\`" >&2
echo "     (backend silent paths must surface through Sentry/GlitchTip)" >&2
exit 1
