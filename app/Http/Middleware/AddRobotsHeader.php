<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Global rather than in the web group: redirects, JSON, signed media, the health routes and
 * Laravel's own error pages have no <head> for the robots meta tag, and some of them never
 * pass through the web group.
 */
class AddRobotsHeader
{
    public const VALUE = 'noindex, nofollow';

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Robots-Tag', self::VALUE);

        return $response;
    }
}
