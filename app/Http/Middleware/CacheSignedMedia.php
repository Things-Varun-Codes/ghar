<?php

namespace App\Http\Middleware;

use App\Shell\Support\SignedUrls;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Laravel serves the local media disk with `no-store`, which throws away the stable signed
 * URLs SignedUrls builds: every visit downloads every photo again. A signed media response
 * gets the same Cache-Control the bucket is told to send, plus validators.
 *
 * Global, because the framework registers the /storage route outside every group.
 */
class CacheSignedMedia
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $route = $request->route();

        if (
            ! $route
            || ! is_object($route)
            || $route->getName() !== 'storage.local'
            || $response->getStatusCode() !== 200
        ) {
            return $response;
        }

        $response->headers->set('Cache-Control', SignedUrls::CACHE_CONTROL);

        $path = (string) $route->parameter('path');
        $disk = Storage::disk('local');

        $lastModified = $disk->lastModified($path);
        $response->setLastModified((new \DateTimeImmutable)->setTimestamp($lastModified));
        $response->setEtag(sha1($path.'|'.$lastModified.'|'.$disk->size($path)));

        $response->isNotModified($request);

        return $response;
    }
}
