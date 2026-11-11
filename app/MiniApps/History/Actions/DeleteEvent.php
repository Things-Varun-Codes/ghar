<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteEvent
{
    public function __construct(
        private readonly LogEventChange $logEventChange,
    ) {}

    public function __invoke(Event $event, User $actor): void
    {
        DB::transaction(function () use ($event, $actor): void {
            ($this->logEventChange)($event, 'delete', [
                'user_id' => $actor->id,
                'summary' => 'Event deleted',
                'changes' => null,
                'created_at' => now(),
            ]);

            // entity_references has string-typed endpoints and no FK, so nothing cascades.
            DB::table('entity_references')
                ->where('from_type', 'history.event')
                ->where('from_id', $event->id)
                ->delete();

            $event->delete();
        });
    }
}
