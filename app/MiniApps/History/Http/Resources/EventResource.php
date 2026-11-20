<?php

namespace App\MiniApps\History\Http\Resources;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\History\Models\EventReaction;
use App\MiniApps\History\Support\VideoPosterResolver;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
use App\Shell\Support\SignedUrls;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @phpstan-type PersonShape array{id: int, name: string, avatar_url: string|null}
 * @phpstan-type ReactionShape array{key: string, emoji: string, count: int, mine: bool, people: list<PersonShape>}
 * @phpstan-type CommentShape array{id: int, body: string, author: PersonShape|null, created_at: string, can: array{delete: bool}}
 */
class EventResource
{
    public function __construct(
        private readonly SignedUrls $signedUrls,
    ) {}

    /**
     * The moment must come from a query that started with Event::forResource().
     *
     * @param  array<string, array<string, mixed>>  $links  what the story's links point at now (LinkedThings)
     * @return array{
     *     id: int,
     *     date: string,
     *     date_label: string,
     *     year: int,
     *     title: string|null,
     *     location_freetext: string|null,
     *     location_place_id: string|null,
     *     location_name: string|null,
     *     location_address: string|null,
     *     location_lat: float|null,
     *     location_lng: float|null,
     *     body_html: string|null,
     *     links: object,
     *     created_at: string|null,
     *     updated_at: string|null,
     *     media: array,
     *     changes: array,
     *     creator: PersonShape|null,
     *     birthday_of: PersonShape|null,
     *     reactions: list<ReactionShape>,
     *     comments: list<CommentShape>,
     *     can: array{update: bool, delete: bool},
     * }
     */
    public function __invoke(Event $event, ?User $viewer = null, array $links = []): array
    {
        $videoPosters = $event->getMedia('video-posters');

        $media = $event->getMedia('photos')
            ->concat($event->getMedia('videos'))
            ->map(function (Media $m) use ($videoPosters) {
                $poster = null;
                // collection_name, not mime_type: UploadedFile::fake() reports
                // application/x-empty.
                if ($m->collection_name === 'videos') {
                    $poster = VideoPosterResolver::forVideo($m, $videoPosters);
                }

                return $this->signedUrls->forMedia($m, $poster);
            })
            ->values()
            ->all();

        $changes = $event->changes
            ->take(50)
            ->map(fn (EventChange $change) => [
                'id' => $change->id,
                'user_name' => ($change->user ? app(Household::class)->shortName($change->user) : 'Someone'),
                'action' => $change->action,
                'summary' => $change->summary,
                'created_at' => $change->created_at->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'id' => $event->id,
            'date' => $event->occurred_on->format('Y-m-d'),
            // "4 Jun 2024": the same shape formatDate() in resources/js/lib/dates.ts gives.
            'date_label' => $event->occurred_on->format('j M Y'),
            'year' => (int) $event->occurred_on->format('Y'),
            'title' => $event->title,
            'location_freetext' => $event->location_freetext,
            'location_place_id' => $event->location_place_id,
            'location_name' => $event->location_name,
            'location_address' => $event->location_address,
            'location_lat' => $event->location_lat !== null ? (float) $event->location_lat : null,
            'location_lng' => $event->location_lng !== null ? (float) $event->location_lng : null,
            'body_html' => $event->body_html,
            // An object even when empty, so the page can look links up by key.
            'links' => (object) $links,
            'created_at' => $event->created_at->toIso8601String(),
            'updated_at' => $event->updated_at->toIso8601String(),
            'media' => $media,
            'changes' => $changes,
            'creator' => $event->creator !== null ? Person::short($event->creator) : null,
            'birthday_of' => $event->birthdayOf !== null ? Person::short($event->birthdayOf) : null,
            'reactions' => $this->reactions($event, $viewer),
            'comments' => $this->comments($event, $viewer),
            'can' => [
                'update' => (bool) $viewer?->can('update', $event),
                'delete' => (bool) $viewer?->can('delete', $event),
            ],
        ];
    }

    /**
     * Every emoji of the set, in its order, with a count of 0 when nobody has used it, so the
     * sheet draws its toggles straight from the payload.
     *
     * @return list<ReactionShape>
     */
    private function reactions(Event $event, ?User $viewer): array
    {
        $byKey = $event->reactions->groupBy('reaction');

        return array_map(function (string $key, string $emoji) use ($byKey, $viewer): array {
            $people = $byKey->get($key, collect())
                ->map(fn (EventReaction $reaction): array => Person::short($reaction->user))
                ->values()
                ->all();

            return [
                'key' => $key,
                'emoji' => $emoji,
                'count' => count($people),
                'mine' => $viewer !== null && in_array($viewer->id, array_column($people, 'id'), true),
                'people' => $people,
            ];
        }, array_keys(EventReaction::EMOJI), EventReaction::EMOJI);
    }

    /** @return list<CommentShape> */
    private function comments(Event $event, ?User $viewer): array
    {
        return $event->comments
            ->map(fn (EventComment $comment): array => [
                'id' => $comment->id,
                'body' => $comment->body,
                'author' => $comment->author !== null ? Person::short($comment->author) : null,
                'created_at' => $comment->created_at->toIso8601String(),
                'can' => [
                    'delete' => (bool) $viewer?->can('delete', $comment),
                ],
            ])
            ->values()
            ->all();
    }
}
