<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Services\SafeFetcher;
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

    public function __construct(private readonly SafeFetcher $fetcher) {}

    /** @return array{path: string, type: string}|null */
    public function get(string $url): ?array
    {
        $base = $this->directory().'/'.hash('sha256', $url);

        if (is_file("{$base}.bin") && is_file("{$base}.type")) {
            @touch("{$base}.bin");

            return ['path' => "{$base}.bin", 'type' => (string) file_get_contents("{$base}.type")];
        }

        if (is_file("{$base}.miss") && filemtime("{$base}.miss") > time() - self::MISS_SECONDS) {
            return null;
        }

        $fetched = $this->fetcher->get($url, self::TYPES, self::MAX_BYTES);
        // What the bytes are, not what the server called them.
        $type = $fetched === null ? null : (new \finfo(FILEINFO_MIME_TYPE))->buffer($fetched->body);

        if ($fetched === null || ! in_array($type, self::TYPES, true)) {
            @file_put_contents("{$base}.miss", '');

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
        @unlink("{$base}.miss");

        $this->prune();

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
