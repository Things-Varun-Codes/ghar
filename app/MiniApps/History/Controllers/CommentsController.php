<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Actions\AddComment;
use App\MiniApps\History\Http\Requests\StoreCommentRequest;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Both answer back(), like ReactionsController. The route's scoped binding resolves a
 * comment only through its own moment.
 */
class CommentsController
{
    public function store(Event $event, StoreCommentRequest $request, AddComment $action): RedirectResponse
    {
        Gate::authorize('view', $event);

        $action($event, $request->string('body')->toString(), $request->user());

        return back();
    }

    public function destroy(Event $event, EventComment $comment): RedirectResponse
    {
        Gate::authorize('delete', $comment);

        $comment->delete();

        return back();
    }
}
