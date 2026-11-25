#!/usr/bin/env node
// Fails if an authenticated GET route is neither in smoke.spec.mjs's `routes` nor in SKIP
// below (with a written reason). Node built-ins only, so it runs without npm install.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SMOKE_FILE = path.join(REPO_ROOT, 'scripts', 'smoke', 'smoke.spec.mjs');

const PLACEHOLDER = ':param';

const SKIP = {
    'apps/our-exchange/flowers':
        'Redirects to /apps/our-exchange/postcards, which smoke visits — no page of its own.',
    'api/corner/link-preview':
        'JSON endpoint, no rendered page — smoke asserts a visible h1/h2, which does not apply.',
    'api/corner/picture-preview':
        'Returns an image fetched from the pasted address, not a page — no h1/h2 to assert, and smoke must not reach the network.',
    'apps/our-shelf/items/{item}/picture':
        "Returns an item's picture (an image, not a page) — no h1/h2 to assert, and a miss would fetch from the network.",
    'api/linkable/search':
        'JSON endpoint, no rendered page — smoke asserts a visible h1/h2, which does not apply.',
    'api/map/{path}':
        "The map's tiles and style, fetched from the tile host — not a page, and smoke must not reach the network.",
    'api/places/search':
        'JSON endpoint that asks an outside place search — no h1/h2 to assert, and smoke must not reach the network.',
    'user/confirmed-password-status':
        'Fortify JSON status endpoint, no view — nothing to page-mount.',
    'user/two-factor-qr-code':
        'Fortify JSON endpoint; the Security page gets the QR code as a prop instead.',
    'user/two-factor-secret-key':
        'Fortify JSON endpoint; the Security page gets the setup key as a prop instead.',
    'user/two-factor-recovery-codes':
        'Fortify JSON endpoint; the Security page gets the recovery codes as a prop instead.',
    'settings/email/verify':
        'Requires a valid URL::temporarySignedRoute signature plus user and email query params, then 302s to settings.profile on success — a signed action endpoint, not a page-mount surface.',
    'go/{code}':
        '302 redirect to a stored external destination — nothing renders, so the page-mount assertion does not apply.',
};

for (const [route, reason] of Object.entries(SKIP)) {
    if (!reason || !reason.trim()) {
        throw new Error(
            `check-smoke-routes: SKIP entry "${route}" has a blank reason — every skip must be justified.`,
        );
    }
}

function normaliseRouteUri(uri) {
    let key = uri.startsWith('/') ? uri : `/${uri}`;

    if (key.length > 1 && key.endsWith('/')) {
        key = key.slice(0, -1);
    }

    key = key.replace(/\{[^}]*\}/g, PLACEHOLDER);

    return key;
}

function normaliseSmokePath(rawPath) {
    let key = rawPath.split('?')[0];

    key = key.replace(/\$\{[^}]*\}/g, PLACEHOLDER);

    return normaliseRouteUri(key);
}

function getLiveAuthenticatedGetRoutes() {
    const json = execFileSync('php', ['artisan', 'route:list', '--json'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    });
    const routes = JSON.parse(json);

    return routes.filter((r) => {
        const methods = (r.method || '').split('|');
        const middleware = r.middleware || [];

        return (
            methods.includes('GET') &&
            middleware.some((m) => m === 'auth' || m.startsWith('auth:'))
        );
    });
}

function extractSmokePaths() {
    const text = readFileSync(SMOKE_FILE, 'utf8');
    const pattern = /path:\s*(?:'([^']*)'|`([^`]*)`)/g;
    const paths = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
        paths.push(match[1] ?? match[2]);
    }

    if (paths.length < 30) {
        throw new Error(
            `check-smoke-routes: only extracted ${paths.length} path literals from scripts/smoke/smoke.spec.mjs — expected 30+. ` +
                "The extraction regex has likely stopped matching the file's shape, which silently turns this check into a no-op. Fix the regex.",
        );
    }

    return paths;
}

function main() {
    const liveRoutes = getLiveAuthenticatedGetRoutes();
    const smokePaths = extractSmokePaths();
    const smokeKeys = new Set(smokePaths.map(normaliseSmokePath));

    const uncovered = [];
    let skipped = 0;
    let covered = 0;

    for (const route of liveRoutes) {
        const key = normaliseRouteUri(route.uri);

        if (smokeKeys.has(key)) {
            covered += 1;
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(SKIP, route.uri)) {
            skipped += 1;
            continue;
        }

        uncovered.push(route);
    }

    // Informational: usually a renamed route smoke.spec.mjs still lists.
    const liveKeys = new Set(liveRoutes.map((r) => normaliseRouteUri(r.uri)));
    const orphanedSmokePaths = smokePaths.filter(
        (p) => !liveKeys.has(normaliseSmokePath(p)),
    );

    if (orphanedSmokePaths.length > 0) {
        console.log(
            `[check-smoke-routes] INFO: ${orphanedSmokePaths.length} smoke.spec.mjs path(s) match no live authenticated GET route:`,
        );

        for (const p of orphanedSmokePaths) {
            console.log(`  - ${p}`);
        }
    }

    if (uncovered.length > 0) {
        console.error(
            `[check-smoke-routes] FAIL: ${uncovered.length} authenticated GET route(s) are covered by neither scripts/smoke/smoke.spec.mjs's routes array nor this script's SKIP map:`,
        );

        for (const route of uncovered) {
            console.error(
                `  - ${route.uri}  (route name: ${route.name ?? '(unnamed)'})`,
            );
        }

        console.error(
            "\nFix: add each route above to scripts/smoke/smoke.spec.mjs's routes array, or add it to SKIP in scripts/check-smoke-routes.mjs with a written reason.",
        );
        process.exit(1);
    }

    console.log(
        `[check-smoke-routes] PASS — ${covered} covered, ${skipped} skipped, ${liveRoutes.length} total authenticated GET routes.`,
    );
}

main();
