<?php

namespace App\Http\Controllers;

use App\Shell\Support\MiniAppRegistry;
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

        // Long-press shortcuts, one per room. Admin-only rooms are left out: the manifest is
        // public and the same for everyone.
        $shortcuts = collect(MiniAppRegistry::visibleFor(null))
            ->map(fn (array $app): array => [
                'name' => $app['name'],
                'url' => $app['route'],
                'description' => $app['description'] ?? '',
                'icons' => [$icon('/icon-192.png', '192x192', 'any')],
            ])
            ->values()
            ->all();

        return response()
            ->json([
                'id' => '/',
                'name' => config('app.name'),
                'short_name' => config('app.name'),
                'description' => 'A private home on the web for your family.',
                'start_url' => '/',
                'scope' => '/',
                'display' => 'standalone',
                'orientation' => 'portrait',
                'background_color' => '#fbfaf6',
                'theme_color' => '#fbfaf6',
                'icons' => [
                    $icon('/icon-192.png', '192x192', 'any'),
                    $icon('/icon-512.png', '512x512', 'any'),
                    $icon('/icon-maskable-512.png', '512x512', 'maskable'),
                ],
                'shortcuts' => $shortcuts,
            ], options: JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            ->header('Content-Type', 'application/manifest+json');
    }
}
