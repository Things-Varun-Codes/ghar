<?php

namespace App\Shell\Auth;

use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\LockoutResponse as LockoutResponseContract;
use Laravel\Fortify\LoginRateLimiter;

/**
 * Fortify's default puts the throttle message on `email`, where it collides with the
 * failed-credentials error. This gives it its own key so the login page can show a
 * countdown.
 */
class ShellLockoutResponse implements LockoutResponseContract
{
    public function __construct(protected LoginRateLimiter $limiter) {}

    public function toResponse($request)
    {
        $seconds = $this->limiter->availableIn($request);

        throw ValidationException::withMessages([
            'throttle' => ["Slow down a sec. Try again in {$seconds}s."],
        ])->status(Response::HTTP_TOO_MANY_REQUESTS);
    }
}
