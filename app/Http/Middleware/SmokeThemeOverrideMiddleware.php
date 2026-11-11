<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the smoke harness walk both themes without touching the settings row. Non-production
 * only.
 */
class SmokeThemeOverrideMiddleware
{
    /** @param  Closure(Request): (Response)  $next */
    public function handle(Request $request, Closure $next): Response
    {
        // Keep first, so the override can never be read in production.
        if (app()->environment('production')) {
            return $next($request);
        }

        $override = $request->cookie('smoke_theme');
        if ($override === null) {
            return $next($request);
        }

        $validSlugs = array_column(config('themes.themes', []), 'slug');
        if (! in_array($override, $validSlugs, true)) {
            return $next($request);
        }

        $request->attributes->set('smoke_active_theme', $override);

        return $next($request);
    }
}
