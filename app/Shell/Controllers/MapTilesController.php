<?php

namespace App\Shell\Controllers;

use App\Shell\Services\MapTiles;
use Symfony\Component\HttpFoundation\Response;

class MapTilesController
{
    public function show(string $path, MapTiles $tiles): Response
    {
        abort_if(str_contains($path, '..'), 404);

        $found = $tiles->fetch($path);
        if ($found === null) {
            return response('The map is unavailable for now.', 502);
        }

        // Tiles don't change under a dated path; the JSON names those paths, so it's kept briefly.
        $maxAge = str_contains($found['type'], 'json') ? 3600 : 604800;

        return response($found['body'], $found['status'], [
            'Content-Type' => $found['type'],
            'Cache-Control' => $found['status'] === 200 ? "private, max-age={$maxAge}" : 'no-store',
        ]);
    }
}
