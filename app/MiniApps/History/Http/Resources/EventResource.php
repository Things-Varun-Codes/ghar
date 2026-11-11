<?php

namespace App\MiniApps\History\Http\Resources;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\MiniApps\History\Support\VideoPosterResolver;
use App\Shell\Models\User;
use App\Shell\Support\SignedUrls;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class EventResource
{
    public function __construct(
        private readonly SignedUrls $signedUrls,
    ) {}

    /**
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
     *     created_at: string|null,
     *     updated_at: string|null,
     *     media: array,
     *     changes: array,
     *     can: array{update: bool, delete: bool},
     * }
     */
    public function __invoke(Event $event, ?User $viewer = null): array
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
                'user_name' => $change->user?->name ?? 'Someone',
                'action' => $change->action,
                'summary' => $change->summary,
                'created_at' => $change->created_at->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'id' => $event->id,
            'date' => $event->occurred_on->format('Y-m-d'),
            'date_label' => $event->occurred_on->format('M j, Y'),
            'year' => (int) $event->occurred_on->format('Y'),
            'title' => $event->title,
            'location_freetext' => $event->location_freetext,
            'location_place_id' => $event->location_place_id,
            'location_name' => $event->location_name,
            'location_address' => $event->location_address,
            'location_lat' => $event->location_lat !== null ? (float) $event->location_lat : null,
            'location_lng' => $event->location_lng !== null ? (float) $event->location_lng : null,
            'body_html' => $event->body_html,
            'created_at' => $event->created_at->toIso8601String(),
            'updated_at' => $event->updated_at->toIso8601String(),
            'media' => $media,
            'changes' => $changes,
            'can' => [
                'update' => (bool) $viewer?->can('update', $event),
                'delete' => (bool) $viewer?->can('delete', $event),
            ],
        ];
    }
}
