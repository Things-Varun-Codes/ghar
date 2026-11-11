<?php

namespace App\MiniApps\History\Policies;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;

class EventPolicy
{
    public function update(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function delete(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function attachMedia(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    public function detachMedia(User $user, Event $event): bool
    {
        return $this->manages($user, $event);
    }

    private function manages(User $user, Event $event): bool
    {
        return $event->creator_id === $user->id || $user->can('admin');
    }
}
