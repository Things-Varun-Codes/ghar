<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fortify registers the password.confirm* routes unconditionally, and nothing here uses
 * them.
 */
class BlockUnwantedFortifyRoutes
{
    private const BLOCKED = [
        'user/confirm-password',
        'user/confirmed-password-status',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->path(), self::BLOCKED, true)) {
            abort(404);
        }

        return $next($request);
    }
}
