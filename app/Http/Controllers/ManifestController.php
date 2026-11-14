<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/**
 * The PWA manifest, served by the app rather than as a static file so the installed name follows
 * APP_NAME. Unauthenticated: browsers fetch a manifest without cookies.
 */
class ManifestController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $icon = fn (string $src, string $size, string $purpose): array => [
            'src' => $src,
            'sizes' => $size,
            'type' => 'image/png',
            'purpose' => $purpose,
        ];

        return response()
            ->json([
                'name' => config('app.name'),
                'short_name' => config('app.name'),
                'description' => 'A private home on the web for your family.',
                'start_url' => '/',
                'display' => 'standalone',
                'orientation' => 'portrait',
                'background_color' => '#fbf6ee',
                'theme_color' => '#fbf6ee',
                'icons' => [
                    $icon('/icon-192.png', '192x192', 'any'),
                    $icon('/icon-512.png', '512x512', 'any'),
                    $icon('/icon-maskable-512.png', '512x512', 'maskable'),
                ],
            ], options: JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'no-cache, must-revalidate');
    }
}
