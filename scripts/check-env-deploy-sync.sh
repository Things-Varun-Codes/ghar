#!/usr/bin/env bash
# Fails when .env.example and DEPLOY.md's ```env block disagree, so a new variable
# can't ship undocumented and silently no-op. Commented keys don't count.

set -euo pipefail

ENV_KEYS=$(grep -E '^[A-Z][A-Z0-9_]*=' .env.example | sed -E 's/=.*$//' | sort -u)

DEPLOY_KEYS=$(sed -n '/^```env$/,/^```$/p' DEPLOY.md \
    | grep -E '^[A-Z][A-Z0-9_]*=' \
    | sed -E 's/=.*$//' \
    | sort -u)

MISSING_IN_DEPLOY=$(comm -23 <(echo "$ENV_KEYS") <(echo "$DEPLOY_KEYS") || true)
MISSING_IN_ENV=$(comm -13 <(echo "$ENV_KEYS") <(echo "$DEPLOY_KEYS") || true)

if [ -n "$MISSING_IN_DEPLOY" ]; then
    echo "ERROR: keys in .env.example missing from DEPLOY.md \`\`\`env block:" >&2
    echo "$MISSING_IN_DEPLOY" | sed 's/^/  - /' >&2
    echo "" >&2
    echo "Fix: add the listed keys (as 'KEY=' with empty value) to the \`\`\`env block under" >&2
    echo "'## Environment variables' in DEPLOY.md, then re-push." >&2
    exit 1
fi
if [ -n "$MISSING_IN_ENV" ]; then
    echo "ERROR: keys in DEPLOY.md \`\`\`env block missing from .env.example (orphan documentation):" >&2
    echo "$MISSING_IN_ENV" | sed 's/^/  - /' >&2
    echo "" >&2
    echo "Fix: either add the listed keys to .env.example (if app code reads them) or remove" >&2
    echo "them from DEPLOY.md's \`\`\`env block (if they are stale documentation)." >&2
    exit 1
fi

echo "✓ .env.example ↔ DEPLOY.md sync ok"
