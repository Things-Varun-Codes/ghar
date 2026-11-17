<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Services\LinkPreview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** What a link says about itself, for the add form to fill in while someone types. */
class LinkPreviewController
{
    public function preview(Request $request, LinkPreview $preview): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'url:http,https', 'max:2048'],
        ]);

        $found = $preview->lookup($validated['url']);

        return response()->json([
            'ok' => $found['title'] !== null || $found['image_url'] !== null,
            ...$found,
        ]);
    }
}
