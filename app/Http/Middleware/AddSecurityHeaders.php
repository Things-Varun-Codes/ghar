<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Must run after HandleInertiaRequests in the stack, so the nonce is set before Vite renders
 * its tags.
 */
class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();
        $nonce = Vite::cspNonce();

        /** @var Response $response */
        $response = $next($request);

        $isLocal = app()->environment('local');

        $scriptSrc = "'self' 'nonce-{$nonce}'".($isLocal ? " 'unsafe-eval'" : '');
        // 'unsafe-inline' rather than a nonce: CSP3 nonces cover <style> tags but not inline
        // style="" attributes, and React style props render as those.
        $styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com";
        $connectSrc = "'self'".($isLocal ? ' ws://127.0.0.1:* http://127.0.0.1:* ws://localhost:* http://localhost:*' : '');
        $imgSrc = "'self' data: blob: https://i.ytimg.com https://i.scdn.co https://*.spotifycdn.com https://images.plex.tv";
        $mediaSrc = "'self' blob:";
        $fontSrc = "'self' https://fonts.gstatic.com data:";

        // The Vite dev server is another origin; without this `composer dev` renders unstyled.
        // Scripts already pass through the nonce.
        if ($isLocal && Vite::isRunningHot()) {
            $viteOrigin = trim((string) file_get_contents(Vite::hotFile()));
            $styleSrc .= ' '.$viteOrigin;
            $fontSrc .= ' '.$viteOrigin;
            $imgSrc .= ' '.$viteOrigin;
        }

        // The browser SDK posts to the DSN's origin; the server DSN stays in for a shared backend.
        foreach (array_unique(array_filter([
            self::originFromUrl(config('sentry.dsn')),
            self::originFromUrl(config('services.sentry_browser.dsn')),
        ])) as $sentryOrigin) {
            $connectSrc .= ' '.$sentryOrigin;
        }

        $bucketOrigin = config('shell.media_disk') === 's3' ? self::bucketOrigin() : null;
        if ($bucketOrigin !== null) {
            $imgSrc .= ' '.$bucketOrigin;
            $mediaSrc .= ' '.$bucketOrigin;
        }

        if (filled(config('services.google_maps.key'))) {
            $googleMapsOrigins = ' https://*.googleapis.com https://*.gstatic.com';
            $scriptSrc .= $googleMapsOrigins;
            $connectSrc .= $googleMapsOrigins;
            $imgSrc .= $googleMapsOrigins;
        }

        $cspDirectives = [
            "default-src 'self'",
            "script-src {$scriptSrc}",
            "style-src {$styleSrc}",
            "font-src {$fontSrc}",
            "img-src {$imgSrc}",
            "media-src {$mediaSrc}",
            "object-src 'none'",
            "connect-src {$connectSrc}",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        if (($cspReportUri = self::cspReportUri()) !== null) {
            $cspDirectives[] = "report-uri {$cspReportUri}";
        }

        $csp = implode('; ', $cspDirectives);

        $response->headers->set('Content-Security-Policy', $csp);
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), midi=(), interest-cohort=()'
        );

        // Cloudflare's edge returns 502 when total response header bytes pass an undocumented
        // threshold, and the Vite/Spatie preload Link header is what tips it over.
        $response->headers->remove('Link');

        return $response;
    }

    private static function cspReportUri(): ?string
    {
        $dsn = config('sentry.dsn');
        if (! is_string($dsn) || $dsn === '') {
            return null;
        }

        $parts = parse_url($dsn);
        if (! is_array($parts)) {
            return null;
        }

        $host = $parts['host'] ?? null;
        $publicKey = $parts['user'] ?? null;
        $path = isset($parts['path']) ? trim((string) $parts['path'], '/') : '';

        if (! is_string($host) || $host === '' || ! is_string($publicKey) || $publicKey === '' || $path === '') {
            return null;
        }

        $segments = explode('/', $path);
        $projectId = end($segments) ?: null;

        if ($projectId === null) {
            return null;
        }

        return "https://{$host}/api/{$projectId}/security/?sentry_key={$publicKey}";
    }

    /** @var array<string, ?string> */
    private static array $bucketOrigins = [];

    /**
     * Where presigned media URLs point: the endpoint for path-style stores, a bucket
     * subdomain otherwise. Signing is local, so asking the client is cheaper than
     * re-deriving every provider's URL scheme.
     */
    private static function bucketOrigin(): ?string
    {
        $config = (array) config('filesystems.disks.s3');

        // Without keys the SDK would go looking for cloud instance credentials over the network.
        if (blank($config['key'] ?? null) || blank($config['secret'] ?? null) || blank($config['bucket'] ?? null)) {
            return null;
        }

        $key = (string) json_encode($config);
        if (array_key_exists($key, self::$bucketOrigins)) {
            return self::$bucketOrigins[$key];
        }

        try {
            $url = Storage::build($config)->temporaryUrl('csp-origin-probe', now()->addMinute());
        } catch (Throwable) {
            $url = null;
        }

        return self::$bucketOrigins[$key] = self::originFromUrl($url);
    }

    private static function originFromUrl(mixed $url): ?string
    {
        if (! is_string($url) || $url === '') {
            return null;
        }

        $parts = parse_url($url);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;

        if (! is_string($scheme) || $scheme === '' || ! is_string($host) || $host === '') {
            return null;
        }

        return $scheme.'://'.$host;
    }
}
