<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventReaction;
use App\Shell\Models\User;

class RemoveReaction
{
    public function __invoke(Event $event, string $reaction, User $actor): void
    {
        EventReaction::query()
            ->where('event_id', $event->id)
            ->where('user_id', $actor->id)
            ->where('reaction', $reaction)
            ->delete();
    }
}
