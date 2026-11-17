<?php

declare(strict_types=1);

// Runs before the suite, so a test run that can't work fails once with a reason
// and not once per test:
//
// 1. A linked git worktree gets a test database of its own. Two checkouts on
//    different branches would otherwise migrate `ghar_test` under each other.
// 2. Wait for Postgres, and create the database when it is missing.
// 3. Stop when there is no frontend build.

require __DIR__.'/../vendor/autoload.php';

(static function (): void {
    // Pages render through Vite, so without a build every page test fails with
    // ViteManifestNotFoundException.
    if (! is_file(__DIR__.'/../public/build/manifest.json') && ! is_file(__DIR__.'/../public/hot')) {
        fwrite(STDERR, "\nNo frontend build in public/build. Run `npm run build`, then run the tests again.\n\n");
        exit(1);
    }

    $env = static fn (string $key, string $default): string => (string) (getenv($key) ?: $default);

    $database = $env('DB_DATABASE', 'ghar_test');
    $root = dirname(__DIR__);

    // `.git` is a file in a linked worktree. Only the default name is replaced,
    // so a DB_DATABASE someone set on purpose is left alone.
    if ($database === 'ghar_test' && is_file($root.'/.git')) {
        $slug = substr((string) preg_replace('/[^a-z0-9]+/', '_', strtolower(basename($root))), 0, 40);
        $database = 'ghar_test_'.$slug;
        putenv('DB_DATABASE='.$database);
        $_ENV['DB_DATABASE'] = $_SERVER['DB_DATABASE'] = $database;
    }

    if ($env('DB_CONNECTION', 'pgsql') !== 'pgsql' || $env('DB_URL', '') !== '') {
        return;
    }

    $host = $env('DB_HOST', '127.0.0.1');
    $port = $env('DB_PORT', '5432');
    $deadline = microtime(true) + 20;

    while (true) {
        try {
            $pdo = new PDO(
                "pgsql:host={$host};port={$port};dbname=postgres",
                $env('DB_USERNAME', 'ghar'),
                $env('DB_PASSWORD', 'ghar'),
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3],
            );
            break;
        } catch (PDOException $e) {
            if (microtime(true) >= $deadline) {
                fwrite(STDERR, "\nNo Postgres at {$host}:{$port} ({$e->getMessage()}).\nStart it with `npm run dev-sync`, then run the tests again.\n\n");
                exit(1);
            }
            usleep(500_000);
        }
    }

    $exists = $pdo->prepare('select 1 from pg_database where datname = ?');
    $exists->execute([$database]);

    if ($exists->fetchColumn() === false) {
        $pdo->exec('create database "'.str_replace('"', '""', $database).'"');
    }
})();
