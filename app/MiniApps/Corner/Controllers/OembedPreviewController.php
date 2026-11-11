<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Services\OEmbedFetcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OembedPreviewController
{
    public function preview(Request $request, OEmbedFetcher $fetcher): JsonResponse
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
