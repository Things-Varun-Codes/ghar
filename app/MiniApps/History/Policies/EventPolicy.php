<?php

namespace App\MiniApps\History\Policies;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;

class EventPolicy
{
    // Every household member sees every moment.
    public function view(User $user, Event $event): bool
    {
        return true;
    }

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
        return $user->makerOrAdmin($event->creator_id);
    }
}
