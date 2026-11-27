/**
 * What the two browser smoke runs share: the PHP environment, the Playwright config
 * (one `artisan serve` on this checkout's port, seeded first, then an admin sign-in saved as
 * storage state) and a `test` that fails on any page error or console error.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, expect, test as base } from '@playwright/test';

import { portOffset } from '../lib/checkout-port.mjs';
import { smokeDatabaseEnv } from '../lib/smoke-database.mjs';

export const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
);

/**
 * @param {{ name: string, port: number, database: string, overrides?: Record<string, string> }} run
 */
export function defineSmokeConfig({
    name,
    port: basePort,
    database: baseDatabase,
    overrides = {},
}) {
    // A worktree runs on its own port and database, so worktrees can smoke at once.
    const offset = portOffset(REPO_ROOT);
    const port = basePort + offset;
    const database = offset ? `${baseDatabase}_${offset}` : baseDatabase;
    const baseURL = `http://127.0.0.1:${port}`;
    const outputDir = path.join(REPO_ROOT, 'test-results', name);

    return defineConfig({
        testDir: path.join(REPO_ROOT, 'scripts/smoke'),
        outputDir,
        globalSetup: path.join(REPO_ROOT, 'scripts/smoke/global-setup.mjs'),
        // One `artisan serve`, and GETs that change state: one page at a time, in order.
        workers: 1,
        fullyParallel: false,
        retries: 0,
        forbidOnly: !!process.env.CI,
        reporter: 'list',
        use: { baseURL, trace: 'retain-on-failure' },
        projects: [
            { name: 'login', testMatch: 'login.setup.mjs' },
            {
                name,
                testMatch: `${name}.spec.mjs`,
                dependencies: ['login'],
                use: { storageState: path.join(outputDir, 'admin.json') },
            },
        ],
        webServer: {
            command: `php artisan serve --host=127.0.0.1 --port=${port}`,
            cwd: REPO_ROOT,
            // A port, not a URL: the server starts before global setup creates the database.
            port,
            // Never test a stale server left by an earlier run.
            reuseExistingServer: false,
            // The request log would flood the report.
            stderr: 'ignore',
            env: {
                APP_ENV: 'testing',
                // Fixed, so the server, the seeding and the scheduler share one key.
                APP_KEY: 'base64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
                APP_DEBUG: 'true',
                APP_URL: baseURL,
                ...smokeDatabaseEnv(database),
                SESSION_DRIVER: 'file',
                MAIL_MAILER: 'array',
                // Seeded photos and postcards live on the local disk: same-origin signed
                // URLs, no bucket. The prefix keeps them apart from the developer's files.
                MEDIA_DISK: 'local',
                MEDIA_PREFIX: name === 'smoke' ? 'smoke' : `smoke-${name}`,
                VAPID_PUBLIC_KEY:
                    'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE',
                ...overrides,
            },
        },
    });
}

/**
 * Runs `php artisan …` against the run's database and returns its stdout.
 *
 * @param {import('@playwright/test').FullConfig} config
 * @param {string[]} args
 */
export function artisan(config, ...args) {
    return execFileSync('php', ['artisan', ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: { ...process.env, ...config.webServer?.env },
        timeout: 180_000,
    });
}

export const test = base.extend({
    // Every page error and console error, from load to the end of the test.
    jsErrors: [
        async ({ page }, provide) => {
            const errors = [];

            page.on('pageerror', (err) =>
                errors.push(`[pageerror] ${err.message}`),
            );
            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    errors.push(`[console.error] ${msg.text()}`);
                }
            });
            await provide(errors);
            expect(errors, 'page errors and console errors').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };
