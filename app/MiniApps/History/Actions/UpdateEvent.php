<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Actions\Concerns\ExtractsCornerLinks;
use App\MiniApps\History\Http\Requests\UpdateEventRequest;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateEvent
{
    use ExtractsCornerLinks;

    public function __construct(
        private readonly SanitizeBodyHtml $sanitizeBodyHtml,
        private readonly LinkableEntities $linkable,
        private readonly LogEventChange $logEventChange,
    ) {}

    public function __invoke(Event $event, UpdateEventRequest $request, User $actor): Event
    {
        $validated = $request->validated();

        if (isset($validated['body_html'])) {
            $validated['body_html'] = ! empty($validated['body_html'])
                ? ($this->sanitizeBodyHtml)($validated['body_html'])
                : null;
        }

        return DB::transaction(function () use ($event, $validated, $actor): Event {
            // Before the update, so the diff is against what was persisted.
            $oldRefs = DB::table('entity_references')
                ->where('from_type', 'history.event')
                ->where('from_id', $event->id)
                ->get()
                ->map(fn ($r) => $r->to_type.':'.$r->to_id)
                ->all();

            $event->fill($validated);
            $changed = array_map(
                fn (string $field): string => $field === 'body_html' ? 'body' : $field,
                array_keys($event->getDirty()),
            );
            $event->save();

            if ($changed !== []) {
                ($this->logEventChange)($event, 'edit', [
                    'user_id' => $actor->id,
                    'summary' => 'Updated '.implode(', ', $changed),
                    'changes' => $changed,
                    'created_at' => now(),
                ]);
            }

            $fresh = $event->fresh();
            $newRefs = $this->extractCornerLinks(
                $fresh?->body_html,
                $this->linkable,
            );

            $toRemove = array_values(array_diff($oldRefs, $newRefs));
            $toAdd = array_values(array_diff($newRefs, $oldRefs));

            if ($toRemove !== [] || $toAdd !== []) {
                $linkable = $this->linkable;
                $eventId = $event->id;
                DB::afterCommit(function () use ($linkable, $eventId, $toRemove, $toAdd): void {
                    foreach ($toRemove as $ref) {
                        [$type, $id] = explode(':', $ref, 2);
                        try {
                            $linkable->removeReference(
                                'history.event',
                                $eventId,
                                $type,
                                (int) $id,
                            );
                        } catch (Throwable $e) {
                            report($e);
                        }
                    }
                    foreach ($toAdd as $ref) {
                        [$type, $id] = explode(':', $ref, 2);
                        try {
                            $linkable->recordReference(
                                'history.event',
                                $eventId,
                                $type,
                                (int) $id,
                            );
                        } catch (Throwable $e) {
                            report($e);
                        }
                    }
                });
            }

            return $event->fresh();
        });
    }
}
