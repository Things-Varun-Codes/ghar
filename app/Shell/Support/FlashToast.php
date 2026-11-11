<?php

namespace App\Shell\Support;

use Inertia\Inertia;

/**
 * Writes Inertia's native flash bag, which the client turns into a toast
 * (use-flash-toast.ts). A `toast` key on the middleware-shared `flash` prop would compile
 * but never fire.
 */
class FlashToast
{
    public static function success(string $message): void
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
    }

    public static function error(string $message): void
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => $message]);
    }
}
