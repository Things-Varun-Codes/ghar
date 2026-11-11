<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Services\PlexMetadataFetcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlexPreviewController
{
    public function preview(Request $request, PlexMetadataFetcher $fetcher): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'url', 'max:2048'],
        ]);

        $meta = $fetcher->fetch($validated['url']);

        if ($meta === null) {
            return response()->json(['ok' => false]);
        }

        return response()->json(['ok' => true, ...$meta]);
    }
}
