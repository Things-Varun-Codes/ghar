<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Http\Requests\StoreCommentRequest;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Both answer back(), like ReactionsController. The route's scoped binding resolves a
 * comment only through its own moment.
 */
class CommentsController
{
    public function store(Event $event, StoreCommentRequest $request): RedirectResponse
    {
        return back();
    }

    public function destroy(Event $event, EventComment $comment, Request $request): RedirectResponse
    {
        return back();
    }
}
