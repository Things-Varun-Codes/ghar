<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Throwable;

/**
 * The limiter's counters live in the cache, and in production the cache lives in the
 * database. An outage must reach HealthzController and come out as a 503, not die here as a
 * 500.
 */
class ThrottleHealthProbe extends ThrottleRequests
{
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = '')
    {
        try {
            return parent::handle(...func_get_args());
        } catch (ThrottleRequestsException $e) {
            throw $e;
        } catch (Throwable) {
            return $next($request);
        }
    }
}
