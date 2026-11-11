<?php

namespace App\MiniApps\History\Controllers;

use App\MiniApps\History\Models\Event;
use App\Shell\Support\SignedUrls;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class GalleryController
{
    public function __construct(private SignedUrls $signedUrls) {}

    public function index(Request $request): Response
    {
        $type = $request->query('type', 'all');
        $year = $request->query('year') ? (int) $request->query('year') : null;

        $direction = $request->query('order') === 'oldest-first' ? 'asc' : 'desc';
        $orderLabel = $direction === 'asc' ? 'oldest-first' : 'newest-first';

        // Joins events so the database can order by the parent's occurred_on.
        $query = Media::query()
            ->where('media.model_type', Event::class)
            ->whereIn('media.collection_name', ['photos', 'videos'])
            ->join('our_history_events', function ($j) {
                $j->on('media.model_id', '=', 'our_history_events.id')
                    ->where('media.model_type', Event::class)
                    ->whereNull('our_history_events.deleted_at');
            })
            ->select('media.*')
            ->with('model')
            ->orderBy('our_history_events.occurred_on', $direction)
            ->orderBy('our_history_events.created_at', $direction)
            ->orderBy('media.id', $direction);

        if ($type === 'photos') {
            $query->where('media.collection_name', 'photos');
        } elseif ($type === 'videos') {
            $query->where('media.collection_name', 'videos');
        }

        if ($year) {
            $query->where('our_history_events.occurred_on', '>=', "{$year}-01-01")
                ->where('our_history_events.occurred_on', '<', ($year + 1).'-01-01');
        }

        $paginator = $query->paginate(24)->withQueryString();

        $videoIds = $paginator->getCollection()
            ->where('collection_name', 'videos')
            ->pluck('id')
            ->all();

        // Deliberately not VideoPosterResolver: an indexed array stays O(1) per video at
        // gallery scale.
        $postersByVideoId = [];
        if (! empty($videoIds)) {
            Media::where('model_type', Event::class)
                ->where('collection_name', 'video-posters')
                ->whereIn('custom_properties->for_media_id', $videoIds)
                ->get()
                ->each(function (Media $poster) use (&$postersByVideoId) {
                    $forId = $poster->custom_properties['for_media_id'] ?? null;
                    if ($forId !== null) {
                        $postersByVideoId[(int) $forId] = $poster;
                    }
                });
        }

        $paginator->through(function (Media $m) use ($postersByVideoId) {
            $poster = $m->collection_name === 'videos'
                ? ($postersByVideoId[$m->id] ?? null)
                : null;

            $base = $this->signedUrls->forMedia($m, $poster);

            /** @var Event|null $event */
            $event = $m->model;
            $base['event_title'] = $event?->title ?? '';
            $base['event_date'] = $event?->occurred_on->format('F j, Y') ?? '';

            return $base;
        });

        // Without the ?year predicate, or the rail would collapse to the selected year.
        $yearCollections = match ($type) {
            'photos' => ['photos'],
            'videos' => ['videos'],
            default => ['photos', 'videos'],
        };

        $availableYears = Event::query()
            ->whereHas('media', fn ($q) => $q->whereIn('collection_name', $yearCollections))
            ->pluck('occurred_on')
            ->map(fn ($date) => (int) $date->year)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        $photosTotal = $this->mediaQuery()
            ->where('collection_name', 'photos')
            ->count();

        $videosTotal = $this->mediaQuery()
            ->where('collection_name', 'videos')
            ->count();

        $eventsTotal = Event::query()->count();

        return Inertia::render('MiniApps/History/Pages/Gallery', [
            'media' => $paginator,
            'filters' => [
                'type' => $type,
                'year' => $year,
            ],
            'available_years' => $availableYears,
            'counts' => [
                'photos' => $photosTotal,
                'videos' => $videosTotal,
                'events' => $eventsTotal,
            ],
            'order' => $orderLabel,
        ]);
    }

    private function mediaQuery(): Builder
    {
        return Media::where('model_type', Event::class)
            ->whereIn('collection_name', ['photos', 'videos'])
            // @phpstan-ignore-next-line method.notFound — withoutTrashed() comes from Event's SoftDeletes trait; larastan's generic Builder type for the MorphTo relation doesn't see it.
            ->whereHas('model', fn ($q) => $q->withoutTrashed());
    }
}
