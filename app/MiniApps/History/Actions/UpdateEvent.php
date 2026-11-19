<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Actions\Concerns\ExtractsCornerLinks;
use App\MiniApps\History\Http\Requests\UpdateEventRequest;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\OnThisDay;
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

            if (! array_key_exists('birthday_user_id', $validated) && $event->isDirty('occurred_on') && ! $this->stillBirthday($event)) {
                $event->birthday_user_id = null;
            }

            $changed = array_map(
                fn (string $field): string => match ($field) {
                    'body_html' => 'body',
                    'birthday_user_id' => 'birthday',
                    default => $field,
                },
                array_keys($event->getDirty()),
            );
            $summary = $this->summary($event, $changed);
            $event->save();

            if ($changed !== []) {
                ($this->logEventChange)($event, 'edit', [
                    'user_id' => $actor->id,
                    'summary' => $summary,
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

    /** A moment moved to another date stays someone's birthday only if it still falls on it. */
    private function stillBirthday(Event $event): bool
    {
        if ($event->birthday_user_id === null) {
            return true;
        }

        $birthday = User::query()->find($event->birthday_user_id)?->birthday;

        return $birthday !== null && OnThisDay::sameDayOfYear($birthday, $event->occurred_on);
    }

    /**
     * "Updated date, place and linked to Meera's birthday", in words rather than columns.
     * Before save(), while the original birthday is still there to name.
     *
     * @param  list<string>  $changed
     */
    private function summary(Event $event, array $changed): string
    {
        $fields = collect($changed)
            ->reject(fn (string $field): bool => $field === 'birthday')
            ->map(fn (string $field): string => match (true) {
                $field === 'occurred_on' => 'date',
                str_starts_with($field, 'location_') => 'place',
                default => $field,
            })
            ->unique()
            ->values();
        $parts = $fields->isEmpty() ? [] : ['updated '.$fields->implode(', ')];

        if (in_array('birthday', $changed, true)) {
            $linked = $event->birthday_user_id;
            $member = User::query()->find($linked ?? $event->getOriginal('birthday_user_id'));
            $whose = $member === null ? 'a birthday' : "{$member->firstName()}'s birthday";
            $parts[] = $linked !== null ? "linked to {$whose}" : "unlinked from {$whose}";
        }

        return ucfirst(implode(' and ', $parts));
    }
}
