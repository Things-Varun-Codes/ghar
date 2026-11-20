<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventReaction;
use App\Shell\Models\User;

/**
 * Adding a reaction the person already has is a no-op. It leaves the moment's updated_at,
 * its activity log and everyone's lock screen alone.
 */
class AddReaction
{
    public function __invoke(Event $event, string $reaction, User $actor): void
    {
        // createOrFirst survives a double tap racing on the unique index.
        EventReaction::query()->createOrFirst([
            'event_id' => $event->id,
            'user_id' => $actor->id,
            'reaction' => $reaction,
        ]);
    }
}
