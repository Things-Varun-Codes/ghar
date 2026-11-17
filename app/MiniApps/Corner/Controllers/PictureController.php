<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\PictureCache;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Pictures, fetched from where they live (through the fetch guards) and served from this app,
 * so the page's image policy stays tight and no browser contacts another site.
 */
class PictureController
{
    private const MAX_AGE_SECONDS = 604800;

    private const PREVIEW_MAX_AGE_SECONDS = 3600;

    /** An item's picture. Its address carries a version, so the browser may keep it. */
    public function show(Item $item, PictureCache $cache): BinaryFileResponse
    {
        return $this->serve($item->image_url, $cache, self::MAX_AGE_SECONDS, immutable: true);
    }

    /**
     * A picture someone is about to save: the one a pasted link offers, or an address typed
     * in. Saving it then costs no second fetch, since the item's picture reads the same cache.
     */
    public function preview(Request $request, PictureCache $cache): BinaryFileResponse
    {
        $validated = $request->validate(['url' => ['required', 'string', 'url:http,https', 'max:2048']]);

        return $this->serve($validated['url'], $cache, self::PREVIEW_MAX_AGE_SECONDS, immutable: false);
    }

    private function serve(?string $source, PictureCache $cache, int $maxAge, bool $immutable): BinaryFileResponse
    {
        abort_if($source === null || ! preg_match('#^https?://#i', $source), 404);

        $picture = $cache->get($source);
        abort_if($picture === null, 404);

        $response = response()->file($picture['path'], [
            'Content-Type' => $picture['type'],
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
        ]);

        // Private: it sits behind a login, so no shared cache may keep it.
        return $response->setCache(['private' => true, 'max_age' => $maxAge, 'immutable' => $immutable]);
    }
}
