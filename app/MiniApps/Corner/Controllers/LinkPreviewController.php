<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Services\LinkPreview;
use App\MiniApps\Corner\Support\ItemRules;
use App\MiniApps\Corner\Support\MapLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** What a link says about itself, for the add form to fill in while someone types. */
class LinkPreviewController
{
    public function preview(Request $request, LinkPreview $preview): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', ItemRules::WEB_URL, 'max:2048'],
        ]);

        $found = $preview->lookup($validated['url']);
        $place = MapLink::place($validated['url']) ?? MapLink::place($found['url']);
        if ($place !== null) {
            $found['title'] = MapLink::splitTitle($found['title'])['name'] ?? $place['label'];
        }

        return response()->json([
            'ok' => $found['title'] !== null || $found['image_url'] !== null,
            ...$found,
        ]);
    }
}
