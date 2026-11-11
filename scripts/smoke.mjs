/**
 * Browser smoke: boots `artisan serve` on its own `ghar_smoke` database, seeds the
 * sample household, and walks every listed route once per theme in headless
 * Chromium. Fails on a console error, a non-200 or a missing heading.
 *
 * Usage: npm run smoke [-- --no-google]
 *   --no-google  also asserts the location field is a plain, typeable input
 */

import { spawn, spawnSync } from 'child_process';
import * as net from 'net';
import { chromium } from 'playwright';
import {
    DEV_ACCOUNTS,
    DEV_INVITE_TOKEN,
    DEV_PASSWORD,
} from './lib/dev-data.mjs';
import { ensureSmokeDatabase, smokeDatabaseEnv } from './lib/smoke-database.mjs';

const noGoogle = process.argv.includes('--no-google');
console.log(
    `[smoke] --no-google: ${
        noGoogle
            ? 'YES (GOOGLE_MAPS_API_KEY stripped; expecting a plain location input)'
            : 'no'
    }`,
);

const SERVE_HOST = '127.0.0.1';
const SERVE_PORT = 8765;
const BASE_URL = `http://${SERVE_HOST}:${SERVE_PORT}`;
const BOOT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 200;

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
    ...smokeDatabaseEnv('ghar_smoke'),
    SESSION_DRIVER: 'file',
    // Shared store and a real queue: /healthz reads heartbeats written by
    // separate scheduler and worker processes.
    CACHE_STORE: 'database',
    QUEUE_CONNECTION: 'database',
    MAIL_MAILER: 'array',
    RESEND_API_KEY: 're_test_smoke',
    // Seeded photos and bouquets live on the local disk: same-origin signed URLs,
    // no bucket. The prefix keeps them apart from the developer's own files.
    MEDIA_DISK: 'local',
    MEDIA_PREFIX: 'smoke',
    // Placeholders so webpush doesn't crash when the Notifications page renders.
    VAPID_SUBJECT: 'mailto:smoke@example.test',
    VAPID_PUBLIC_KEY:
        'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE',
    VAPID_PRIVATE_KEY: 'smoke-private-key-placeholder',
    // --no-google: '' (rather than `undefined`) overrides any value in .env
    // on disk, and renders the typed-location path.
    ...(noGoogle ? { GOOGLE_MAPS_API_KEY: '' } : {}),
};

// One scheduler tick, then a worker draining what it queued.
function runHeartbeats() {
    runCommand('php', ['artisan', 'schedule:run'], 'run the scheduler once');
    runCommand(
        'php',
        ['artisan', 'queue:work', '--stop-when-empty', '--tries=1'],
        'drain the queue',
    );
}

function runCommand(cmd, args, description) {
    process.stdout.write(`  [smoke] ${description}...`);
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

    if (serveProc) {
        try {
            // The whole process group, so PHP children don't hold the port.
            if (serveProc.pid) {
                try {
                    process.kill(-serveProc.pid, 'SIGTERM');
                } catch {
                    serveProc.kill('SIGTERM');
                }
            }
        } catch {
            // Best-effort teardown: it may already be gone.
        }
    }
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

// Reassigns the module-scope `serveProc`, so cleanup() follows a mid-run respawn.
async function startServe() {
    process.stdout.write('[smoke] starting artisan serve...');
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
        console.error('\n[smoke] artisan serve error:', err.message);
    });

    await waitForPort(SERVE_HOST, SERVE_PORT, BOOT_TIMEOUT_MS);
    console.log(' ready');
}

// A single isPortFree() check would race the dying process.
async function stopServe() {
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

    const deadline = Date.now() + BOOT_TIMEOUT_MS;

    while (Date.now() < deadline) {
        if (await isPortFree(SERVE_HOST, SERVE_PORT)) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
        `Timed out waiting for ${SERVE_HOST}:${SERVE_PORT} to free after SIGTERM (${BOOT_TIMEOUT_MS}ms)`,
    );
}

async function main() {
    console.log('[smoke] starting Ghar browser smoke harness');

    // Never silently test a stale server left by a prior run.
    const portFree = await isPortFree(SERVE_HOST, SERVE_PORT);

    if (!portFree) {
        console.error(`[smoke] ERROR: port ${SERVE_PORT} is already in use.`);
        console.error(
            `[smoke] A previous smoke run may not have cleaned up. Kill the process on that port and retry.`,
        );
        process.exit(1);
    }

    // Always rebuild, so it never tests a stale bundle.
    runCommand(
        'npm',
        ['run', 'build'],
        'rebuild Vite bundle (bundle state is always fresh)',
    );

    ensureSmokeDatabase(smokeEnv);
    runCommand(
        'php',
        ['artisan', 'migrate:fresh', '--seed', '--force'],
        'migrate:fresh --seed',
    );


    // The walk logs in as the admin, so the challan and coupon must be ones the
    // admin received, or `view` would 403.
    const fixturesPhp = `
use App\\Shell\\Models\\User;
use App\\MiniApps\\Corner\\Models\\Song;
use App\\MiniApps\\Corner\\Models\\Movie;
use App\\MiniApps\\Corner\\Models\\Activity;
use App\\MiniApps\\Corner\\Models\\Place;
use App\\MiniApps\\Mailbox\\Models\\Challan;
use App\\MiniApps\\Mailbox\\Models\\Coupon;
use Illuminate\\Support\\Facades\\Password;

$admin = User::where('email', '${DEV_ACCOUNTS.admin}')->firstOrFail();
$kabir = User::where('email', '${DEV_ACCOUNTS.kabir}')->firstOrFail();

echo json_encode([
    'resetToken'        => Password::broker()->createToken($kabir),
    'cornerSongId'      => Song::query()->min('id'),
    'cornerMovieId'     => Movie::query()->min('id'),
    'cornerActivityId'  => Activity::query()->min('id'),
    'cornerPlaceId'     => Place::query()->min('id'),
    'mailboxChallanId'  => Challan::where('recipient_id', $admin->id)->firstOrFail()->id,
    'mailboxCouponId'   => Coupon::where('recipient_id', $admin->id)->firstOrFail()->id,
    // A plain member, never the logged-in account, so no self-edit or
    // last-admin guard gets in the way of the edit page.
    'otherUserId'       => $kabir->id,
]);
`.trim();

    const fixtureOutput = runCommand(
        'php',
        ['artisan', 'tinker', '--execute=' + fixturesPhp],
        'seed fixtures',
    );

    const jsonLine = fixtureOutput.split('\n').find((l) => l.startsWith('{'));

    if (!jsonLine) {
        console.error(
            '[smoke] ERROR: could not parse fixture JSON from tinker output:',
        );
        console.error(fixtureOutput);
        process.exit(1);
    }

    const fixtures = {
        ...JSON.parse(jsonLine),
        email: DEV_ACCOUNTS.admin,
        password: DEV_PASSWORD,
        token: DEV_INVITE_TOKEN,
        resetEmail: DEV_ACCOUNTS.kabir,
    };
    console.log(`  [smoke] fixtures: admin=${fixtures.email}`);

    await startServe();

    browser = await chromium.launch({ headless: true });

    const routes = [
        {
            path: '/login',
            auth: false,
            description: '/login (unauthenticated sentinel)',
        },
        {
            path: '/forgot-password',
            auth: false,
            description: '/forgot-password (unauthenticated sentinel)',
        },
        {
            path: '/dashboard',
            auth: true,
            description: '/dashboard (authenticated)',
        },
        {
            path: '/settings/profile',
            auth: true,
            description: '/settings/profile',
        },
        {
            path: '/settings/password',
            auth: true,
            description: '/settings/password',
        },
        {
            path: '/admin/users',
            auth: true,
            description: '/admin/users',
        },
        {
            path: '/admin/invites',
            auth: true,
            description: '/admin/invites',
        },
        {
            path: '/admin/theme',
            auth: true,
            description: '/admin/theme (Wayfinder admin page)',
        },
        {
            path: `/admin/users/${fixtures.otherUserId}/edit`,
            auth: true,
            description:
                '/admin/users/{id}/edit (admin user edit)',
        },
        {
            path: `/invitations/${fixtures.token}`,
            auth: false,
            description:
                '/invitations/{token} (unauthenticated invite accept)',
        },
        {
            path: `/reset-password/${fixtures.resetToken}?email=${encodeURIComponent(fixtures.resetEmail)}`,
            auth: false,
            description: '/reset-password/{token}',
        },
        {
            path: '/apps/our-history',
            auth: true,
            description:
                '/apps/our-history (Our History timeline)',
        },
        {
            path: '/apps/our-history/gallery',
            auth: true,
            description:
                '/apps/our-history/gallery (Our History gallery)',
        },
        {
            path: '/apps/our-history/calendar',
            auth: true,
            description:
                '/apps/our-history/calendar (Our History calendar)',
        },
        {
            path: '/settings/notifications',
            auth: true,
            description:
                '/settings/notifications (push opt-in settings)',
        },
        {
            path: '/admin/notifications',
            auth: true,
            description:
                '/admin/notifications (admin send notification)',
        },
        {
            path: '/admin/shortlinks',
            auth: true,
            description:
                '/admin/shortlinks (NFC short links admin)',
        },
        {
            path: '/apps/our-corner',
            auth: true,
            description: '/apps/our-corner (Our Corner landing)',
        },
        {
            path: '/apps/our-corner/songs',
            auth: true,
            description: '/apps/our-corner/songs (Songs list)',
        },
        {
            path: `/apps/our-corner/songs/${fixtures.cornerSongId}`,
            auth: true,
            description:
                '/apps/our-corner/songs/{song} (Song detail)',
        },
        {
            path: '/apps/our-corner/movies',
            auth: true,
            description: '/apps/our-corner/movies (Movies list)',
        },
        {
            path: `/apps/our-corner/movies/${fixtures.cornerMovieId}`,
            auth: true,
            description:
                '/apps/our-corner/movies/{movie} (Movie detail)',
        },
        {
            path: '/apps/our-corner/activities',
            auth: true,
            description:
                '/apps/our-corner/activities (Activities list)',
        },
        {
            path: `/apps/our-corner/activities/${fixtures.cornerActivityId}`,
            auth: true,
            description:
                '/apps/our-corner/activities/{activity} (Activity detail)',
        },
        {
            path: '/apps/our-corner/places',
            auth: true,
            description: '/apps/our-corner/places (Places list)',
        },
        {
            path: `/apps/our-corner/places/${fixtures.cornerPlaceId}`,
            auth: true,
            description:
                '/apps/our-corner/places/{place} (Place detail)',
        },
        {
            path: '/apps/our-mailbox',
            auth: true,
            description: '/apps/our-mailbox (Our Mailbox landing)',
        },
        {
            path: '/apps/our-mailbox/messages',
            auth: true,
            description: '/apps/our-mailbox/messages (Messages)',
        },
        {
            path: '/apps/our-mailbox/challans',
            auth: true,
            description:
                '/apps/our-mailbox/challans (Challans index)',
        },
        {
            path: `/apps/our-mailbox/challans/${fixtures.mailboxChallanId}`,
            auth: true,
            description:
                '/apps/our-mailbox/challans/{challan} (Challan artifact/show)',
        },
        {
            path: '/apps/our-mailbox/coupons',
            auth: true,
            description: '/apps/our-mailbox/coupons (Coupons index)',
        },
        {
            path: `/apps/our-mailbox/coupons/${fixtures.mailboxCouponId}`,
            auth: true,
            description:
                '/apps/our-mailbox/coupons/{coupon} (Coupon voucher artifact/show)',
        },
        {
            path: '/apps/our-mailbox/flowers',
            auth: true,
            description:
                '/apps/our-mailbox/flowers (Flowers index)',
        },
        // `before` runs the real scheduler and a worker, so the heartbeats are fresh.
        {
            path: '/healthz',
            auth: false,
            description: '/healthz (JSON readiness probe)',
            expect: 'json',
            requireKeys: ['status', 'checks'],
            before: runHeartbeats,
        },
    ];

    const authContext = await browser.newContext();
    const loginPage = await authContext.newPage();

    const loginRes = await loginPage.goto(`${BASE_URL}/login`);

    if (!loginRes || loginRes.status() !== 200) {
        console.error(
            `[smoke] ERROR: /login returned ${loginRes?.status()} instead of 200`,
        );
        await cleanup();
        process.exit(1);
    }

    await loginPage.fill('input[name="email"]', fixtures.email);
    await loginPage.fill('input[name="password"]', fixtures.password);
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForLoadState('networkidle');
    await loginPage.close();

    // Walks every route once per theme. SmokeThemeOverrideMiddleware reads the cookie.
    const themes = ['pastel', 'warm'];
    const setThemeCookie = async (ctx, themeSlug) => {
        await ctx.addCookies([
            {
                name: 'smoke_theme',
                value: themeSlug,
                url: BASE_URL,
            },
        ]);
    };

    let passed = 0;
    const total = routes.length * themes.length;
    const failures = [];

    for (const [themeIndex, themeSlug] of themes.entries()) {
        // Recycle the server between passes: `artisan serve` is single-threaded and
        // the last routes of a second pass time out on a server this tired.
        if (themeIndex > 0) {
            await stopServe();
            await startServe();
        }

        await setThemeCookie(authContext, themeSlug);
        console.log(
            `\n[smoke] === walking ${routes.length} routes in theme: ${themeSlug} ===`,
        );

        for (const route of routes) {
            const desc = `[${themeSlug}] ${route.description}`;
            const jsErrors = [];
            let ctx;

            if (route.auth) {
                ctx = authContext;
            } else {
                ctx = await browser.newContext();
                await setThemeCookie(ctx, themeSlug);
            }

            // JSON endpoints mount no React app, so the heading sentinels don't apply.
            if (route.expect === 'json') {
                try {
                    route.before?.();

                    const apiRes = await ctx.request.get(
                        `${BASE_URL}${route.path}`,
                    );
                    const status = apiRes.status();
                    const accepted = route.acceptStatuses ?? [200];

                    if (!accepted.includes(status)) {
                        failures.push({
                            route: desc,
                            error: `HTTP ${status} (expected one of: ${accepted.join(', ')})`,
                            jsErrors: [],
                        });

                        if (!route.auth) {
await ctx.close();
}

                        continue;
                    }

                    let body;

                    try {
                        body = await apiRes.json();
                    } catch (e) {
                        failures.push({
                            route: desc,
                            error: `Response body is not valid JSON: ${e.message}`,
                            jsErrors: [],
                        });

                        if (!route.auth) {
await ctx.close();
}

                        continue;
                    }

                    const missing = (route.requireKeys ?? []).filter(
                        (k) => !(k in body),
                    );

                    if (missing.length > 0) {
                        failures.push({
                            route: desc,
                            error: `Missing JSON keys: ${missing.join(', ')}`,
                            jsErrors: [],
                        });

                        if (!route.auth) {
await ctx.close();
}

                        continue;
                    }

                    passed++;
                    console.log(
                        `  [smoke] PASS  ${desc} (status=${status}, keys=${Object.keys(body).length})`,
                    );
                } catch (err) {
                    failures.push({
                        route: desc,
                        error: err.message,
                        jsErrors: [],
                    });
                    console.error(`  [smoke] FAIL  ${desc}: ${err.message}`);
                } finally {
                    if (!route.auth) {
await ctx.close();
}
                }

                continue;
            }

            const page = await ctx.newPage();

            page.on('pageerror', (err) => {
                jsErrors.push(`[pageerror] ${err.message}`);
            });
            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    jsErrors.push(`[console.error] ${msg.text()}`);
                }
            });

            try {
                const res = await page.goto(`${BASE_URL}${route.path}`, {
                    waitUntil: 'load',
                });

                const status = res?.status();

                if (status !== 200) {
                    failures.push({
                        route: desc,
                        error: `HTTP ${status} (expected 200)`,
                        jsErrors,
                    });
                    await page.close();

                    if (!route.auth) {
await ctx.close();
}

                    continue;
                }

                if (jsErrors.length > 0) {
                    failures.push({
                        route: desc,
                        error: `${jsErrors.length} JS error(s)`,
                        jsErrors,
                    });
                    await page.close();

                    if (!route.auth) {
await ctx.close();
}

                    continue;
                }

                const headingEl = page.locator('h1, h2').first();
                let headingText = '';

                try {
                    headingText =
                        (await headingEl.textContent({ timeout: 5_000 })) ?? '';
                } catch {
                    headingText = '';
                }

                if (!headingText || headingText.trim().length === 0) {
                    failures.push({
                        route: desc,
                        error: 'No visible h1/h2 heading found — React may not have mounted',
                        jsErrors,
                    });
                    await page.close();

                    if (!route.auth) {
await ctx.close();
}

                    continue;
                }

                if (route.auth) {
                    const isNonDashboard = route.path !== '/dashboard';
                    const chevronCount = await page
                        .locator('button[aria-label^="Back to"]')
                        .count();

                    if (isNonDashboard && chevronCount === 0) {
                        failures.push({
                            route: desc,
                            error:
                                'BackChevron missing on authenticated inner page — ' +
                                'expected button[aria-label^="Back to"] to be present',
                            jsErrors,
                        });
                        await page.close();

                        if (!route.auth) {
await ctx.close();
}

                        continue;
                    }

                    if (!isNonDashboard && chevronCount > 0) {
                        failures.push({
                            route: desc,
                            error:
                                'BackChevron present on /dashboard — ' +
                                'expected BackChevron to return null on the home page',
                            jsErrors,
                        });
                        await page.close();

                        if (!route.auth) {
await ctx.close();
}

                        continue;
                    }
                }

                passed++;
                console.log(
                    `  [smoke] PASS  ${desc} (heading: "${headingText.trim()}")`,
                );
            } catch (err) {
                failures.push({
                    route: desc,
                    error: err.message,
                    jsErrors,
                });
                console.error(`  [smoke] FAIL  ${desc}: ${err.message}`);
            } finally {
                await page.close();

                if (!route.auth) {
await ctx.close();
}
            }
        }
    } // end for (themeSlug of themes)

    // The field mounts only when the EventSheet is open. Runs in the last theme, so
    // anything asserted here must be theme-independent.
    if (noGoogle) {
        const sheetPage = await authContext.newPage();
        const sheetErrors = [];
        sheetPage.on('pageerror', (err) => {
            sheetErrors.push(`[pageerror] ${err.message}`);
        });
        sheetPage.on('console', (msg) => {
            if (msg.type() === 'error') {
                sheetErrors.push(`[console.error] ${msg.text()}`);
            }
        });

        try {
            await sheetPage.goto(`${BASE_URL}/apps/our-history`, {
                waitUntil: 'commit',
            });
            await sheetPage.waitForLoadState('networkidle', {
                timeout: 15_000,
            });

            await sheetPage.getByRole('button', { name: /add moment/i }).click();
            await sheetPage
                .locator('[data-test=location-field]')
                .first()
                .waitFor({
                    state: 'visible',
                    timeout: 5_000,
                });

            const input = sheetPage
                .locator('[data-test=location-field] input')
                .first();
            const typeable =
                (await input.count()) > 0 && (await input.isEditable());

            if (typeable) {
                await input.fill('Kochi');
            }

            if (!typeable || (await input.inputValue()) !== 'Kochi') {
                failures.push({
                    route: '/apps/our-history (Sheet open, --no-google)',
                    error:
                        'Without GOOGLE_MAPS_API_KEY the location field must be a plain ' +
                        'input that takes typed text.',
                    jsErrors: sheetErrors,
                });
            } else if (sheetErrors.length > 0) {
                failures.push({
                    route: '/apps/our-history (Sheet open, --no-google)',
                    error: `${sheetErrors.length} JS error(s) while opening the EventSheet`,
                    jsErrors: sheetErrors,
                });
            } else {
                console.log(
                    '  [smoke --no-google] PASS  location field takes typed text',
                );
            }
        } catch (err) {
            failures.push({
                route: '/apps/our-history (Sheet open, --no-google)',
                error: `Could not exercise the typed-location check: ${err.message}`,
                jsErrors: sheetErrors,
            });
        } finally {
            await sheetPage.close();
        }
    }

    await authContext.close();

    await cleanup();

    if (failures.length > 0) {
        console.error(
            `\n[smoke] FAILED: ${failures.length}/${total} routes had errors:\n`,
        );

        for (const f of failures) {
            console.error(`  FAIL ${f.route}`);
            console.error(`       Error: ${f.error}`);

            if (f.jsErrors.length > 0) {
                console.error(`       JS errors:`);

                for (const e of f.jsErrors) {
                    console.error(`         ${e}`);
                }
            }
        }

        process.exit(1);
    }

    console.log(`\nsmoke: ${passed}/${total} routes mounted cleanly`);
    process.exit(0);
}

main().catch(async (err) => {
    console.error('[smoke] Unhandled error:', err.message);
    await cleanup();
    process.exit(1);
});
