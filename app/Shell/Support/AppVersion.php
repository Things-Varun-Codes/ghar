<?php

namespace App\Shell\Support;

final class AppVersion
{
    private static ?string $current = null;

    private static bool $resolved = false;

    /**
     * Release images bake the exact tag into a VERSION file, because a self-host .env sets
     * GHAR_VERSION to a floating "1" for the image tag and env_file passes that into the container.
     * A source checkout falls back to its commit.
     */
    public static function current(): ?string
    {
        if (self::$resolved) {
            return self::$current;
        }
        self::$resolved = true;

        $file = base_path('VERSION');
        $version = is_file($file) ? trim((string) file_get_contents($file)) : '';

        if ($version === '' && file_exists(base_path('.git'))) {
            $version = trim((string) exec('git -C '.escapeshellarg(base_path()).' rev-parse --short HEAD 2>/dev/null'));
        }

        return self::$current = $version !== '' ? $version : null;
    }

    /** @return array{label: string, url: string|null}|null */
    public static function forPage(): ?array
    {
        $version = config('shell.version');
        if (! is_string($version) || $version === '') {
            return null;
        }

        $repository = config('shell.repository_url');

        if (preg_match('/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/', $version)) {
            return ['label' => "v{$version}", 'url' => "{$repository}/releases/tag/v{$version}"];
        }

        if (preg_match('/^[0-9a-f]{7,40}$/', $version)) {
            return ['label' => $version, 'url' => "{$repository}/commit/{$version}"];
        }

        // Anything else (a CI build's "local") has no page of its own to open.
        return ['label' => $version, 'url' => null];
    }
}
