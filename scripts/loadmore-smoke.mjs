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

import { spawn, spawnSync } from 'node:child_process';
import * as net from 'node:net';

import { chromium } from 'playwright';
import { DEV_ACCOUNTS, DEV_PASSWORD } from './lib/dev-data.mjs';
import {
    ensureSmokeDatabase,
    smokeDatabaseEnv,
} from './lib/smoke-database.mjs';

const SERVE_HOST = '127.0.0.1';
const SERVE_PORT = 8877;
const BASE_URL = `http://${SERVE_HOST}:${SERVE_PORT}`;
const BOOT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 200;

const PAGE_SIZE = 50;

const NEUTRAL_TOAST_MESSAGE = "Something went wrong. Please try again.";

const RETRY_ROW_MESSAGE = "Couldn't load more.";
const RETRY_BUTTON_NAME = 'Try again';

// Noise this harness's own fault injection causes. Suppressed only while a fault is armed.
const CONSOLE_ALLOW_PATTERNS = [/net::ERR_/i, /Failed to load resource/i];

const keyResult = spawnSync('php', ['artisan', 'key:generate', '--show'], {
    encoding: 'utf8',
    env: {
        ...process.env,
        APP_KEY: 'base64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
    },
});
const appKey =
    keyResult.stdout.trim() ||
    'base64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=';

const smokeEnv = {
    ...process.env,
    APP_ENV: 'testing',
    APP_KEY: appKey,
    APP_DEBUG: 'true',
    APP_URL: BASE_URL,
    ...smokeDatabaseEnv('ghar_smoke_loadmore'),
    SESSION_DRIVER: 'file',
    CACHE_STORE: 'array',
    MAIL_MAILER: 'array',
    RESEND_API_KEY: 're_test_loadmore_smoke',
    // The seeder draws photos onto the local disk; the prefix keeps them
    // apart from the developer's own files.
    MEDIA_DISK: 'local',
    MEDIA_PREFIX: 'smoke-loadmore',
    VAPID_SUBJECT: 'mailto:loadmore-smoke@example.test',
    VAPID_PUBLIC_KEY:
        'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE',
    VAPID_PRIVATE_KEY: 'loadmore-smoke-private-key-placeholder',
};

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
    process.stdout.write(`[loadmore-smoke] ${description}...`);

    const result = spawnSync(cmd, args, {
        encoding: 'utf8',
        env: smokeEnv,
        timeout: 180_000,
    });

    if (result.status !== 0) {
        console.error(
            ` FAILED\n${result.stderr || result.stdout || '(no output)'}`,
        );

        throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
    }

    console.log(' OK');

    return result.stdout;
}

function waitForPort(host, port, timeoutMs) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;

        function probe() {
            const socket = new net.Socket();

            socket.setTimeout(200);
            socket.on('connect', () => {
                socket.destroy();
                resolve();
            });
            socket.on('timeout', () => {
                socket.destroy();

                if (Date.now() > deadline) {
                    reject(
                        new Error(
                            `Timed out waiting for ${host}:${port} after ${timeoutMs}ms`,
                        ),
                    );
                } else {
                    setTimeout(probe, POLL_INTERVAL_MS);
                }
            });
            socket.on('error', () => {
                socket.destroy();

                if (Date.now() > deadline) {
                    reject(
                        new Error(
                            `Timed out waiting for ${host}:${port} after ${timeoutMs}ms`,
                        ),
                    );
                } else {
                    setTimeout(probe, POLL_INTERVAL_MS);
                }
            });
            socket.connect(port, host);
        }

        probe();
    });
}

async function isPortFree(host, port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, host);
    });
}

let serveProc = null;
let browser = null;

async function cleanup() {
    if (browser) {
        try {
            await browser.close();
        } catch {
            // Best-effort teardown: it may already be gone.
        }
    }

    if (serveProc && serveProc.pid) {
        try {
            process.kill(-serveProc.pid, 'SIGTERM');
        } catch {
            try {
                serveProc.kill('SIGTERM');
            } catch {
                // Best-effort teardown: it may already be gone.
            }
        }
    }
}

async function startServe() {
    process.stdout.write('[loadmore-smoke] starting artisan serve...');
    serveProc = spawn(
        'php',
        ['artisan', 'serve', `--host=${SERVE_HOST}`, `--port=${SERVE_PORT}`],
        {
            env: smokeEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true,
        },
    );
    serveProc.on('error', (err) => {
        console.error('\n[loadmore-smoke] artisan serve error:', err.message);
    });

    await waitForPort(SERVE_HOST, SERVE_PORT, BOOT_TIMEOUT_MS);
    console.log(' ready');
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
const pendingRowSelector = '#corner-list-panel [role="status"]';
const alertRowSelector = '#corner-list-panel [role="alert"]';
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

    await startServe();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    attachConsolePolicy(page);

    try {
        const loginRes = await page.goto(`${BASE_URL}/login`);

        if (!loginRes || loginRes.status() !== 200) {
            throw new Error(
                `/login returned ${loginRes?.status()} instead of 200`,
            );
        }

        await page.fill('input[name="email"]', DEV_ACCOUNTS.admin);
        await page.fill('input[name="password"]', DEV_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
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
