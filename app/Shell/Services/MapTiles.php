<?php

namespace App\Shell\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The map's style, fonts, icons and tiles, fetched from the tile host (OpenFreeMap unless
 * MAP_TILES_URL says otherwise) so the host never sees who in the household looked where.
 * JSON documents name the host in their URLs; those are rewritten to come back through here.
 */
class MapTiles
{
    private const DOWN_KEY = 'map-tiles:down';

    /** @return array{status: int, body: string, type: string}|null Null while the host is down. */
    public function fetch(string $path): ?array
    {
        if (Cache::has(self::DOWN_KEY)) {
            return null;
        }

        $key = 'map-tiles:json:'.sha1($path);
        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $upstream = self::upstream();
        $url = $upstream.'/'.implode('/', array_map(rawurlencode(...), explode('/', $path)));

        try {
            // Short, so a hung host can't hold the few php-fpm workers the app shares with it.
            $response = Http::timeout(3)->get($url);
        } catch (Throwable) {
            $response = null;
        }

        if ($response === null || $response->serverError()) {
            Cache::put(self::DOWN_KEY, true, 60);

            return null;
        }

        $type = $response->header('Content-Type') ?: 'application/octet-stream';
        $found = ['status' => $response->status(), 'body' => $response->body(), 'type' => $type];

        if ($response->successful() && str_contains($type, 'json')) {
            // Absolute: the map's worker can't resolve a relative URL.
            $found['body'] = str_replace([$upstream, str_replace('/', '\/', $upstream)], [url('/api/map'), str_replace('/', '\/', url('/api/map'))], $found['body']);
            // The style and tile index name dated tile paths, so they're kept only an hour.
            Cache::put($key, $found, 3600);
        }

        return $found;
    }

    private static function upstream(): string
    {
        return rtrim((string) config('services.map.url'), '/');
    }
}
