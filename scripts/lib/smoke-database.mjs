/**
 * Dedicated Postgres database for a smoke harness.
 *
 * Each harness owns one database (e.g. `ghar_smoke`) on the dev Postgres from
 * docker-compose.override.yml, creates it if missing and runs
 * `migrate:fresh` against it, so it never touches the developer's `ghar`
 * database. Connection settings default to that container and can be
 * overridden with SMOKE_DB_HOST / SMOKE_DB_PORT / SMOKE_DB_USERNAME /
 * SMOKE_DB_PASSWORD.
 */

import { spawnSync } from 'child_process';

/**
 * @param {string} database
 * @returns {Record<string, string>}
 */
export function smokeDatabaseEnv(database) {
    return {
        DB_CONNECTION: 'pgsql',
        DB_URL: '',
        DB_HOST: process.env.SMOKE_DB_HOST ?? '127.0.0.1',
        DB_PORT: process.env.SMOKE_DB_PORT ?? '5432',
        DB_DATABASE: database,
        DB_USERNAME: process.env.SMOKE_DB_USERNAME ?? 'ghar',
        DB_PASSWORD: process.env.SMOKE_DB_PASSWORD ?? 'ghar',
    };
}

/**
 * Create the database named in `env.DB_DATABASE` if it does not exist yet.
 * Uses PHP's PDO (always present here) so Node needs no Postgres driver.
 *
 * @param {Record<string, string>} env
 */
export function ensureSmokeDatabase(env) {
    const php = `
        $pdo = new PDO(
            sprintf('pgsql:host=%s;port=%s;dbname=postgres', getenv('DB_HOST'), getenv('DB_PORT')),
            getenv('DB_USERNAME'),
            getenv('DB_PASSWORD'),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );
        $name = getenv('DB_DATABASE');
        $exists = $pdo->prepare('select 1 from pg_database where datname = ?');
        $exists->execute([$name]);
        if (! $exists->fetchColumn()) {
            $pdo->exec('create database "'.str_replace('"', '""', $name).'"');
        }
    `;
    const result = spawnSync('php', ['-r', php], {
        encoding: 'utf8',
        env: { ...process.env, ...env },
    });

    if (result.status !== 0) {
        throw new Error(
            `Could not reach or create Postgres database "${env.DB_DATABASE}" on ` +
                `${env.DB_HOST}:${env.DB_PORT}. Start it with ` +
                '`docker compose -f docker-compose.override.yml up -d postgres`.\n' +
                (result.stderr || result.stdout),
        );
    }
}
