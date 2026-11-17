/**
 * Boot code the browser smoke harnesses share: the environment they run PHP with, the
 * commands they run, and `artisan serve` on a port of their own.
 */

import { spawn, spawnSync } from 'node:child_process';
import * as net from 'node:net';

import { smokeDatabaseEnv } from './smoke-database.mjs';

export const SERVE_HOST = '127.0.0.1';

const BOOT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 200;
const FALLBACK_APP_KEY = 'base64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=';

function generateAppKey() {
    const result = spawnSync('php', ['artisan', 'key:generate', '--show'], {
        encoding: 'utf8',
        env: { ...process.env, APP_KEY: FALLBACK_APP_KEY },
    });

    return result.stdout.trim() || FALLBACK_APP_KEY;
}

/**
 * The environment every smoke command and the server run with. `overrides` carries what
 * differs per harness (cache, queue, placeholder keys).
 *
 * @param {{ port: number, database: string, mediaPrefix: string, overrides?: Record<string, string> }} options
 * @returns {Record<string, string | undefined>}
 */
export function smokeEnv({ port, database, mediaPrefix, overrides = {} }) {
    return {
        ...process.env,
        APP_ENV: 'testing',
        APP_KEY: generateAppKey(),
        APP_DEBUG: 'true',
        APP_URL: `http://${SERVE_HOST}:${port}`,
        ...smokeDatabaseEnv(database),
        SESSION_DRIVER: 'file',
        MAIL_MAILER: 'array',
        // Seeded photos and bouquets live on the local disk: same-origin signed URLs,
        // no bucket. The prefix keeps them apart from the developer's own files.
        MEDIA_DISK: 'local',
        MEDIA_PREFIX: mediaPrefix,
        VAPID_PUBLIC_KEY:
            'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE',
        ...overrides,
    };
}

/**
 * Runs a command to completion with `env` and returns its stdout.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} label  log prefix, e.g. `[smoke]`
 */
export function runCommand(env, label, cmd, args, description) {
    process.stdout.write(`${label} ${description}...`);
    const result = spawnSync(cmd, args, {
        encoding: 'utf8',
        env,
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

export function waitForPort(host, port, timeoutMs) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;

        function retry() {
            if (Date.now() > deadline) {
                reject(
                    new Error(
                        `Timed out waiting for ${host}:${port} after ${timeoutMs}ms`,
                    ),
                );
            } else {
                setTimeout(probe, POLL_INTERVAL_MS);
            }
        }

        function probe() {
            const socket = new net.Socket();

            socket.setTimeout(200);
            socket.on('connect', () => {
                socket.destroy();
                resolve();
            });
            socket.on('timeout', () => {
                socket.destroy();
                retry();
            });
            socket.on('error', () => {
                socket.destroy();
                retry();
            });
            socket.connect(port, host);
        }

        probe();
    });
}

export function isPortFree(host, port) {
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

/**
 * Starts `artisan serve` and resolves once it accepts connections. `stop()` ends the
 * whole process group, so PHP children don't hold the port.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} label  log prefix, e.g. `[smoke]`
 */
export async function startServe(env, label, port) {
    process.stdout.write(`${label} starting artisan serve...`);
    const proc = spawn(
        'php',
        ['artisan', 'serve', `--host=${SERVE_HOST}`, `--port=${port}`],
        {
            env,
            // Not a pipe: nothing here reads the server's request log, and once an
            // unread pipe fills, `artisan serve` blocks on its next log line and
            // every later request times out.
            stdio: 'ignore',
            detached: true,
        },
    );
    proc.on('error', (err) => {
        console.error(`\n${label} artisan serve error:`, err.message);
    });

    await waitForPort(SERVE_HOST, port, BOOT_TIMEOUT_MS);
    console.log(' ready');

    return {
        stop() {
            if (!proc.pid) {
                return;
            }

            try {
                process.kill(-proc.pid, 'SIGTERM');
            } catch {
                try {
                    proc.kill('SIGTERM');
                } catch {
                    // Best-effort teardown: it may already be gone.
                }
            }
        },
    };
}

/**
 * Signs in on the login page and waits for the redirect away from it.
 *
 * @param {import('playwright').Page} page
 */
export async function login(page, baseUrl, email, password) {
    const response = await page.goto(`${baseUrl}/login`);

    if (!response || response.status() !== 200) {
        throw new Error(`/login returned ${response?.status()} instead of 200`);
    }

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Login is an XHR, not a document load. If the page has already gone idle,
    // waitForLoadState('networkidle') returns at once and closing the page
    // cancels the login, so every authenticated route then renders /login.
    try {
        await page.waitForURL((url) => url.pathname !== '/login', {
            timeout: 30_000,
        });
    } catch {
        throw new Error(`still on /login 30s after signing in as ${email}`);
    }
}
