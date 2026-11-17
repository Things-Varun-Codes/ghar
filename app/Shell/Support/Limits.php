<?php

namespace App\Shell\Support;

use Closure;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

class Limits
{
    /**
     * A limiter keyed by the signed-in user, falling back to the IP for a guest. Keying by IP
     * alone would let one person's burst throttle everyone sharing the home network.
     *
     * @return Closure(Request): Limit
     */
    public static function perUser(int $perMinute): Closure
    {
        return fn (Request $request): Limit => Limit::perMinute($perMinute)
            ->by((string) ($request->user()->id ?? $request->ip()));
    }
}
