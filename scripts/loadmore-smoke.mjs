/**
 * Fault-injection smoke for the Corner Songs load-more path. Forces a transport
 * failure and a 5xx on the cursor request and asserts the inline retry recovers.
 * Inertia's onError never sees those, so nothing else can catch this class. Runs on
 * its own `ghar_smoke_loadmore` database and port.
 *
 * Asserts captureSilent was reached through its toast, which fires whether or not a
 * Sentry DSN is set, so the literal toast copy is duplicated here on purpose.
 *
 * Usage: npm run smoke-loadmore
 */

import { chromium } from 'playwright';
import { DEV_ACCOUNTS, DEV_PASSWORD } from './lib/dev-data.mjs';
import { ensureSmokeDatabase } from './lib/smoke-database.mjs';
import {
    SERVE_HOST,
    isPortFree,
    login,
    runCommand as run,
    smokeEnv as buildSmokeEnv,
    startServe,
} from './lib/smoke-server.mjs';

const SERVE_PORT = 8877;
const BASE_URL = `http://${SERVE_HOST}:${SERVE_PORT}`;

const PAGE_SIZE = 50;

const NEUTRAL_TOAST_MESSAGE = "Something went wrong. Please try again.";

const RETRY_ROW_MESSAGE = "Couldn't load more.";
const RETRY_BUTTON_NAME = 'Try again';

// Noise this harness's own fault injection causes. Suppressed only while a fault is armed.
const CONSOLE_ALLOW_PATTERNS = [/net::ERR_/i, /Failed to load resource/i];

const smokeEnv = buildSmokeEnv({
    port: SERVE_PORT,
    database: 'ghar_smoke_loadmore',
    mediaPrefix: 'smoke-loadmore',
    overrides: {
        CACHE_STORE: 'array',
        RESEND_API_KEY: 're_test_loadmore_smoke',
        VAPID_SUBJECT: 'mailto:loadmore-smoke@example.test',
        VAPID_PRIVATE_KEY: 'loadmore-smoke-private-key-placeholder',
    },
});

const results = [];

function pass(name) {
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
}

function fail(name, err) {
    results.push({ name, ok: false, err: String(err) });
    console.log(`  FAIL  ${name} — ${err}`);
}

function runCommand(cmd, args, description) {
    return run(smokeEnv, '[loadmore-smoke]', cmd, args, description);
}

let server = null;
let browser = null;

async function cleanup() {
    if (browser) {
        try {
            await browser.close();
        } catch {
            // Best-effort teardown: it may already be gone.
        }
    }

    server?.stop();
}

// Chromium's load-failure console messages don't include the URL, so attribution uses
// a window: `faultInjectionActive` is armed only while a case's interception is in place.

const suppressedMessages = [];
const consoleFailures = [];
let pageErrorCount = 0;
let faultInjectionActive = false;

function attachConsolePolicy(page) {
    page.on('console', (msg) => {
        if (msg.type() !== 'error') {
            return;
        }

        const text = msg.text();
        const matchesFaultShape = CONSOLE_ALLOW_PATTERNS.some((re) =>
            re.test(text),
        );

        if (matchesFaultShape && faultInjectionActive) {
            suppressedMessages.push(text);
        } else {
            consoleFailures.push(text);
        }
    });
    page.on('pageerror', (err) => {
        pageErrorCount += 1;
        consoleFailures.push(`[pageerror] ${err.message}`);
    });
}

// The pending row can clear too fast for Playwright to ever see it, so the intercepted
// request itself confirms the sentinel fired.
function createLoadMoreRequestSignal(timeoutMs) {
    let markSeen;
    const seen = new Promise((resolve) => {
        markSeen = resolve;
    });

    return {
        markSeen: () => markSeen(),
        waitForRequest: () =>
            Promise.race([
                seen,
                new Promise((_resolve, reject) => {
                    setTimeout(() => {
                        reject(
                            new Error(
                                'the sentinel never triggered a load-more request against the intercepted cursor route — check the fixture produced a next page',
                            ),
                        );
                    }, timeoutMs);
                }),
            ]),
    };
}

const cursorMatcher = (url) => url.searchParams.has('cursor');

async function installFaultRoute(page, handler) {
    faultInjectionActive = true;
    const signal = createLoadMoreRequestSignal(5_000);

    await page.route(cursorMatcher, async (route) => {
        signal.markSeen();
        await handler(route);
    });

    return {
        signal,
        uninstall: async () => {
            await page.unroute(cursorMatcher);
            faultInjectionActive = false;
        },
    };
}

const songTileSelector =
    '#corner-list-panel a[href^="/apps/our-corner/songs/"]';
// Reassigned for the History case: the failure helpers read whichever list is under test.
let pendingRowSelector = '#corner-list-panel [role="status"]';
let alertRowSelector = '#corner-list-panel [role="alert"]';

const TIMELINE_PAGE_SIZE = 20;
const momentCardSelector =
    '.history-timeline-body article.history-event-card';
const errorDialogSelector = 'dialog#inertia-error-dialog';

async function assertNoErrorDialog(page, caseLabel) {
    const count = await page.locator(errorDialogSelector).count();

    if (count > 0) {
        throw new Error(
            `${caseLabel}: expected no ${errorDialogSelector}, found ${count}`,
        );
    }
}

async function assertGlitchtipToast(page, caseLabel) {
    const toast = page.getByText(NEUTRAL_TOAST_MESSAGE, { exact: false });

    await toast.first().waitFor({ state: 'visible', timeout: 5_000 });
    pass(`${caseLabel}: Glitchtip signal observed (neutral toast)`);
}

async function assertRetryRowRenders(page, caseLabel) {
    const alertRow = page.locator(alertRowSelector);

    await alertRow.first().waitFor({ state: 'visible', timeout: 8_000 });

    const messageText = await alertRow.first().textContent();

    if (!messageText || !messageText.includes(RETRY_ROW_MESSAGE)) {
        throw new Error(
            `${caseLabel}: alert row text "${messageText}" does not include "${RETRY_ROW_MESSAGE}"`,
        );
    }

    pass(`${caseLabel}: inline retry row renders with alert role`);

    const retryButton = page.getByRole('button', { name: RETRY_BUTTON_NAME });

    await retryButton.waitFor({ state: 'visible', timeout: 2_000 });

    if (!(await retryButton.isEnabled())) {
        throw new Error(`${caseLabel}: retry button is present but disabled`);
    }

    pass(`${caseLabel}: retry button present and enabled`);
}

async function triggerLoadMoreAndAssertFailure(page, caseLabel, requestSignal) {
    const pendingRow = page.locator(pendingRowSelector);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    try {
        await requestSignal.waitForRequest();
    } catch (err) {
        throw new Error(`${caseLabel}: ${err.message}`, { cause: err });
    }

    try {
        await pendingRow.first().waitFor({ state: 'hidden', timeout: 10_000 });
    } catch (err) {
        throw new Error(
            `${caseLabel}: the pending row never cleared after the injected failure — the load-more failure path is broken. Original: ${err.message}`,
            { cause: err },
        );
    }

    pass(`${caseLabel}: pending row clears`);

    await assertRetryRowRenders(page, caseLabel);
    await assertNoErrorDialog(page, caseLabel);
    pass(`${caseLabel}: no Inertia error dialog`);
    await assertGlitchtipToast(page, caseLabel);
}

async function main() {
    console.log('[loadmore-smoke] starting fault-injection harness');

    const portFree = await isPortFree(SERVE_HOST, SERVE_PORT);

    if (!portFree) {
        console.error(
            `[loadmore-smoke] ERROR: port ${SERVE_PORT} is already in use — a previous run may not have cleaned up.`,
        );
        process.exit(1);
    }

    ensureSmokeDatabase(smokeEnv);
    runCommand(
        'php',
        ['artisan', 'migrate:fresh', '--seed', '--force'],
        'migrate:fresh --seed',
    );

    server = await startServe(smokeEnv, '[loadmore-smoke]', SERVE_PORT);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    attachConsolePolicy(page);

    try {
        await login(page, BASE_URL, DEV_ACCOUNTS.admin, DEV_PASSWORD);
        pass('login');

        await page.goto(`${BASE_URL}/apps/our-corner/songs`, {
            waitUntil: 'networkidle',
        });

        const initialCount = await page.locator(songTileSelector).count();

        if (initialCount !== PAGE_SIZE) {
            throw new Error(
                `expected ${PAGE_SIZE} song tiles on the initial page, found ${initialCount} — fixture or selector mismatch, not a pagination defect`,
            );
        }

        pass(`initial page renders ${PAGE_SIZE} songs`);

        console.log('\n[loadmore-smoke] === Case A: transport failure ===');
        const caseA = await installFaultRoute(page, (route) =>
            route.abort('connectionrefused'),
        );

        try {
            await triggerLoadMoreAndAssertFailure(
                page,
                'Case A (transport failure)',
                caseA.signal,
            );
        } catch (err) {
            fail('Case A (transport failure)', err.message);
        }

        await caseA.uninstall();

        console.log('\n[loadmore-smoke] === Case B: server failure (5xx) ===');

        // Chromium restores the scroll offset across a reload, so the sentinel can
        // auto-fire on mount. Installing the fault first means that load-more fails too.
        const caseB = await installFaultRoute(page, (route) =>
            route.fulfill({
                status: 500,
                contentType: 'text/html',
                body: '<html><body>500 Internal Server Error (loadmore-smoke fault injection)</body></html>',
            }),
        );

        await page.reload({ waitUntil: 'networkidle' });

        const reloadedCount = await page.locator(songTileSelector).count();

        if (reloadedCount !== PAGE_SIZE) {
            fail(
                'Case B (server failure) setup',
                `expected a clean reload of ${PAGE_SIZE} song tiles, found ${reloadedCount}`,
            );
        }

        try {
            await triggerLoadMoreAndAssertFailure(
                page,
                'Case B (server failure)',
                caseB.signal,
            );
        } catch (err) {
            fail('Case B (server failure)', err.message);
        }

        await caseB.uninstall();

        console.log('\n[loadmore-smoke] === Case C: recovery via retry ===');

        try {
            const retryButton = page.getByRole('button', {
                name: RETRY_BUTTON_NAME,
            });

            await retryButton.waitFor({ state: 'visible', timeout: 5_000 });
            await retryButton.click();
            await page
                .locator(songTileSelector)
                .nth(PAGE_SIZE)
                .waitFor({ state: 'visible', timeout: 10_000 });

            const recoveredCount = await page.locator(songTileSelector).count();

            if (recoveredCount <= PAGE_SIZE) {
                throw new Error(
                    `expected row count to grow past ${PAGE_SIZE} after retry, found ${recoveredCount}`,
                );
            }

            pass('Case C (recovery): retry appends rows past first page');

            const remainingAlerts = await page
                .locator(alertRowSelector)
                .count();

            if (remainingAlerts > 0) {
                throw new Error(
                    `expected the alert row to be gone after recovery, found ${remainingAlerts}`,
                );
            }

            pass('Case C (recovery): alert row cleared after recovery');
        } catch (err) {
            fail('Case C (recovery)', err.message);
        }

        console.log(
            '\n[loadmore-smoke] === Case D: History timeline, failure then retry ===',
        );
        pendingRowSelector = '.history-timeline-body [role="status"]';
        alertRowSelector = '.history-timeline-body [role="alert"]';

        try {
            await page.goto(`${BASE_URL}/apps/our-history`, {
                waitUntil: 'networkidle',
            });

            const firstPage = await page.locator(momentCardSelector).count();

            if (firstPage !== TIMELINE_PAGE_SIZE) {
                throw new Error(
                    `expected ${TIMELINE_PAGE_SIZE} moments on the initial page, found ${firstPage} — fixture or selector mismatch, not a pagination defect`,
                );
            }

            const caseD = await installFaultRoute(page, (route) =>
                route.abort('connectionrefused'),
            );

            try {
                await triggerLoadMoreAndAssertFailure(
                    page,
                    'Case D (History transport failure)',
                    caseD.signal,
                );
            } finally {
                await caseD.uninstall();
            }

            await page.getByRole('button', { name: RETRY_BUTTON_NAME }).click();
            await page
                .locator(momentCardSelector)
                .nth(TIMELINE_PAGE_SIZE)
                .waitFor({ state: 'visible', timeout: 10_000 });
            pass('Case D (History recovery): retry appends moments past first page');

            const remainingAlerts = await page
                .locator(alertRowSelector)
                .count();

            if (remainingAlerts > 0) {
                throw new Error(
                    `expected the alert row to be gone after recovery, found ${remainingAlerts}`,
                );
            }

            pass('Case D (History recovery): alert row cleared after recovery');
        } catch (err) {
            fail('Case D (History)', err.message);
        }

        if (pageErrorCount > 0 || consoleFailures.length > 0) {
            fail(
                'console policy',
                `${pageErrorCount} pageerror(s), ${consoleFailures.length} disallowed console message(s): ${consoleFailures.slice(0, 5).join(' | ')}`,
            );
        } else {
            pass(
                'console policy: zero pageerror, zero disallowed console messages',
            );
        }
    } finally {
        await page.close();
        await context.close();
    }

    console.log(
        '\n[loadmore-smoke] suppressed (fault-attributable) console messages:',
    );

    if (suppressedMessages.length === 0) {
        console.log('  (none)');
    } else {
        for (const m of suppressedMessages) {
            console.log(`  - ${m}`);
        }
    }

    await cleanup();

    const failed = results.filter((r) => !r.ok);

    console.log(
        `\n──────── loadmore-smoke: ${results.length - failed.length}/${results.length} checks passed ────────`,
    );

    if (failed.length > 0) {
        console.log('FAILURES:');

        for (const f of failed) {
            console.log(`  FAIL ${f.name} — ${f.err}`);
        }

        process.exit(1);
    }

    console.log('ALL GREEN');
    process.exit(0);
}

main().catch(async (err) => {
    console.error('[loadmore-smoke] Unhandled error:', err.message);
    await cleanup();
    process.exit(1);
});
