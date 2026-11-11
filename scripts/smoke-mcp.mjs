/**
 * Serves the sample household on 127.0.0.1:8000 from a fresh production
 * bundle, for interactive browser testing. Uses the developer's local database;
 * seeds it only if it has never been seeded, and never wipes existing data
 * (`npm run dev-reset` does that).
 */

import { spawn, spawnSync } from 'node:child_process';

import { DEV_ACCOUNTS, printDevCredentials } from './lib/dev-data.mjs';

function run(cmd, args, options = {}) {
    return spawnSync(cmd, args, { encoding: 'utf8', ...options });
}

function fail(message) {
    console.error(`[smoke-mcp] ${message}`);
    process.exit(1);
}

const build = run('npm', ['run', 'build'], { stdio: 'inherit' });

if (build.status !== 0) {
    fail('`npm run build` failed.');
}

// Prints admin, empty or foreign. Any failure means there is no usable database.
const probe = run('php', [
    'artisan',
    'tinker',
    `--execute=$u = App\\Shell\\Models\\User::query(); echo $u->count() === 0 ? 'empty' : ($u->where('email', '${DEV_ACCOUNTS.admin}')->exists() ? 'admin' : 'foreign');`,
]);
const state = probe.stdout.trim().split('\n').pop();

if (probe.status !== 0 || !['admin', 'empty', 'foreign'].includes(state)) {
    fail(
        'Could not read the local database. Run `npm run dev-setup` first.\n' +
            (probe.stderr || probe.stdout),
    );
}

if (state === 'foreign') {
    fail(
        'The local database has users but not the sample household. Run `npm run dev-reset` to replace them.',
    );
}

if (state === 'empty') {
    const seed = run('php', ['artisan', 'db:seed', '--force'], {
        stdio: 'inherit',
    });

    if (seed.status !== 0) {
        fail('Seeding failed.');
    }
}

printDevCredentials();
console.log('  Open http://127.0.0.1:8000  (Ctrl-C to stop)\n');

const serve = spawn(
    'php',
    ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'],
    { stdio: 'inherit' },
);

serve.on('exit', (code) => process.exit(code ?? 0));
