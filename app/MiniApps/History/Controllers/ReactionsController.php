<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Actions\AddReaction;
use App\MiniApps\History\Actions\RemoveReaction;
use App\MiniApps\History\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * PUT adds the viewer's reaction and DELETE takes it away; both are idempotent. The route
 * allows only the keys of EventReaction::EMOJI. They answer back(): the client asks for
 * `only: ['moment']`, so the open sheet's `?moment=` comes back with the fresh moment.
 */
class ReactionsController
{
    public function update(Event $event, string $reaction, Request $request, AddReaction $action): RedirectResponse
    {
        Gate::authorize('view', $event);

        $action($event, $reaction, $request->user());

        return back();
    }

    public function destroy(Event $event, string $reaction, Request $request, RemoveReaction $action): RedirectResponse
    {
        Gate::authorize('view', $event);

        $action($event, $reaction, $request->user());

        return back();
    }
}
