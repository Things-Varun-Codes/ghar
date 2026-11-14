<?php

namespace App\Shell\Support;

final class AppVersion
{
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
