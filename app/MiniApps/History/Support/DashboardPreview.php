<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Support\SignedUrls;

/**
 * Uses generated conversions only, so a photo still processing is skipped rather than
 * loading its full-size original.
 */
final class DashboardPreview
{
    private const PHOTOS = 3;

    private const EVENTS_SCANNED = 6;

    /** @return array{images: list<string>}|null */
    public static function forUser(User $user): ?array
    {
        $events = Event::query()
            ->whereHas('media', fn ($q) => $q->where('collection_name', 'photos'))
            ->with('media')
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->limit(self::EVENTS_SCANNED)
            ->get();

        $urls = app(SignedUrls::class);
        $images = [];

        foreach ($events as $event) {
            foreach ($event->media->where('collection_name', 'photos') as $media) {
                $url = $urls->forMedia($media)['medium'];

                if ($url !== null) {
                    $images[] = $url;
                }

                if (count($images) === self::PHOTOS) {
                    return ['images' => $images];
                }
            }
        }

        return $images === [] ? null : ['images' => $images];
    }
}
