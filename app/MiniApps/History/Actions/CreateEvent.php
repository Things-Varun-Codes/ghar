<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Actions\Concerns\ExtractsCornerLinks;
use App\MiniApps\History\Http\Requests\StoreEventRequest;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateEvent
{
    use ExtractsCornerLinks;

    public function __construct(
        private readonly SanitizeBodyHtml $sanitizeBodyHtml,
        private readonly LinkableEntities $linkable,
        private readonly LogEventChange $logEventChange,
    ) {}

    public function __invoke(StoreEventRequest $request, User $actor): Event
    {
        $validated = $request->validated();

        $bodyHtml = null;
        if (! empty($validated['body_html'])) {
            $bodyHtml = ($this->sanitizeBodyHtml)($validated['body_html']);
        }

        return DB::transaction(function () use ($validated, $bodyHtml, $actor): Event {
            /** @var Event $event */
            $event = Event::create([
                'occurred_on' => $validated['occurred_on'],
                'title' => $validated['title'] ?? null,
                'location_freetext' => $validated['location_freetext'] ?? null,
                'location_place_id' => $validated['location_place_id'] ?? null,
                'location_name' => $validated['location_name'] ?? null,
                'location_address' => $validated['location_address'] ?? null,
                'location_lat' => $validated['location_lat'] ?? null,
                'location_lng' => $validated['location_lng'] ?? null,
                'body_html' => $bodyHtml,
                'creator_id' => $actor->id,
            ]);

            ($this->logEventChange)($event, 'create', [
                'user_id' => $actor->id,
                'summary' => 'Event created',
                'changes' => null,
                'created_at' => now(),
            ]);

            $newRefs = $this->extractCornerLinks($bodyHtml, $this->linkable);
            if ($newRefs !== []) {
                $linkable = $this->linkable;
                DB::afterCommit(function () use ($event, $newRefs, $linkable): void {
                    foreach ($newRefs as $ref) {
                        [$type, $id] = explode(':', $ref, 2);
                        try {
                            $linkable->recordReference(
                                'history.event',
                                $event->id,
                                $type,
                                (int) $id,
                            );
                        } catch (Throwable $e) {
                            report($e);
                        }
                    }
                });
            }

            return $event;
        });
    }
}
