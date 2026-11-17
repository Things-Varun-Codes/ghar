<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Services\SafeFetcher;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

/**
 * Pictures shown in Corner are fetched from where they live and kept on disk for a while, so
 * pages never make the browser contact another site and a repeat view is instant. The cache is
 * bounded and disposable: losing it only means fetching again.
 */
class PictureCache
{
    public const TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

    private const MAX_BYTES = 5 * 1024 * 1024;

    /** Kept under this; the oldest pictures go first. */
    private const BUDGET_BYTES = 64 * 1024 * 1024;

    private const AFTER_PRUNE_BYTES = 48 * 1024 * 1024;

    /** A picture that couldn't be fetched isn't tried again for this long. */
    private const MISS_SECONDS = 600;

    /** Measuring the whole cache is a directory scan, so it happens at most this often. */
    private const PRUNE_EVERY_SECONDS = 60;

    /** A hit marks a picture as recently used, but rewrites that mark at most this often. */
    private const TOUCH_EVERY_SECONDS = 86400;

    public function __construct(private readonly SafeFetcher $fetcher) {}

    /** @return array{path: string, type: string}|null */
    public function get(string $url): ?array
    {
        $hash = hash('sha256', $url);

        $stored = $this->stored($hash);
        if ($stored !== null) {
            return $stored;
        }

        // One fetch per picture: a page full of the same cold picture waits for the first, then
        // finds what it stored.
        return Cache::lock("corner-picture:{$hash}", 20)->block(15, function () use ($url, $hash): ?array {
            $storedMeanwhile = $this->stored($hash);

            return $storedMeanwhile !== null ? $storedMeanwhile : $this->fetch($url, $hash);
        });
    }

    /** @return array{path: string, type: string}|null */
    private function stored(string $hash): ?array
    {
        $base = $this->directory().'/'.$hash;

        if (! is_file("{$base}.bin") || ! is_file("{$base}.type")) {
            return null;
        }

        if ((int) @filemtime("{$base}.bin") < time() - self::TOUCH_EVERY_SECONDS) {
            @touch("{$base}.bin");
        }

        return ['path' => "{$base}.bin", 'type' => (string) file_get_contents("{$base}.type")];
    }

    /** @return array{path: string, type: string}|null */
    private function fetch(string $url, string $hash): ?array
    {
        if (Cache::has("corner-picture-miss:{$hash}")) {
            return null;
        }

        $fetched = $this->fetcher->get($url, self::TYPES, self::MAX_BYTES);
        // What the bytes are, not what the server called them.
        $type = $fetched === null ? null : (new \finfo(FILEINFO_MIME_TYPE))->buffer($fetched->body);

        if ($fetched === null || ! in_array($type, self::TYPES, true)) {
            Cache::put("corner-picture-miss:{$hash}", true, self::MISS_SECONDS);

            return null;
        }

        return $this->put($url, $fetched->body, $type);
    }

    /**
     * Keeps a picture as if it had been fetched. The sample data uses this so pages show
     * pictures without reaching the network.
     *
     * @return array{path: string, type: string}
     */
    public function put(string $url, string $bytes, string $type): array
    {
        $base = $this->directory().'/'.hash('sha256', $url);

        $temp = "{$base}.".bin2hex(random_bytes(4)).'.tmp';
        file_put_contents($temp, $bytes);
        rename($temp, "{$base}.bin");
        file_put_contents("{$base}.type", $type);
        Cache::forget('corner-picture-miss:'.hash('sha256', $url));

        if (Cache::add('corner-pictures:pruned', true, self::PRUNE_EVERY_SECONDS)) {
            $this->prune();
        }

        return ['path' => "{$base}.bin", 'type' => $type];
    }

    public function directory(): string
    {
        $directory = storage_path('framework/cache/data/corner-pictures');
        File::ensureDirectoryExists($directory);

        return $directory;
    }

    private function prune(): void
    {
        $files = glob($this->directory().'/*.bin') ?: [];
        $total = array_sum(array_map(fn (string $f): int => (int) @filesize($f), $files));

        if ($total <= self::BUDGET_BYTES) {
            return;
        }

        usort($files, fn (string $a, string $b): int => (int) @filemtime($a) <=> (int) @filemtime($b));

        foreach ($files as $file) {
            if ($total <= self::AFTER_PRUNE_BYTES) {
                break;
            }

            $total -= (int) @filesize($file);
            @unlink($file);
            @unlink(substr($file, 0, -4).'.type');
        }
    }
}
