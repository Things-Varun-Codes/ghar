<?php

namespace App\Http\Middleware;

use App\Shell\Services\Rooms;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `room:{slug}` or `room:{slug},{option}`. A room that is off, or an `admin_only` room to anyone
 * but an admin, answers 404, the same as a page that was never there. It sits after `auth`, so a
 * guest is sent to login either way.
 */
class EnsureRoomIsOn
{
    public function __construct(private readonly Rooms $rooms) {}

    public function handle(Request $request, Closure $next, string $slug, ?string $option = null): Response
    {
        $open = $this->rooms->canEnter($request->user(), $slug)
            && ($option === null || $this->rooms->optionOn($slug, $option));

        abort_unless($open, 404);

        return $next($request);
    }
}
