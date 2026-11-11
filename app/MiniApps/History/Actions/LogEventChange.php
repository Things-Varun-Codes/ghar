<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;

class LogEventChange
{
    /** @param  array<string, mixed>  $payload */
    public function __invoke(Event $event, string $action, array $payload = []): EventChange
    {
        /** @var EventChange $change */
        $change = $event->changes()->create([
            'action' => $action,
            ...$payload,
        ]);

        return $change;
    }
}
