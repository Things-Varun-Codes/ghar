<?php

namespace App\MiniApps\History\Support;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
use App\Shell\Support\SignedUrls;
use Carbon\CarbonImmutable;

/** Home's "New this week" rows: moments other members added since $since. */
final class DashboardFeed
{
    private const LIMIT = 8;

    /** @return list<array<string, mixed>> */
    public static function forUser(User $user, CarbonImmutable $since): array
    {
        $urls = app(SignedUrls::class);

        return Event::query()
            ->where('created_at', '>=', $since)
            ->where(fn ($q) => $q->whereNull('creator_id')->orWhere('creator_id', '!=', $user->id))
            ->with(['creator', 'media' => fn ($q) => $q->where('collection_name', 'photos')])
            ->latest('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(function (Event $event) use ($urls): array {
                $photos = $event->media->count();
                $first = $event->media->first();
                $signed = $first ? $urls->forMedia($first) : null;

                return [
                    'kind' => 'new',
                    'title' => ($event->creator ? app(Household::class)->shortName($event->creator) : 'Someone').' added a moment',
                    'detail' => $event->title ?? $event->occurred_on->toFormattedDayDateString(),
                    'at' => $event->created_at->toIso8601String(),
                    'href' => route('apps.our-history.timeline', ['moment' => $event->id], absolute: false),
                    'action' => null,
                    'person' => $event->creator ? Person::of($event->creator) : null,
                    // Conversions only, so a photo still processing shows no thumbnail rather than its original.
                    'image' => $signed['thumb'] ?? $signed['medium'] ?? null,
                    'count' => $photos,
                ];
            })
            ->values()
            ->all();
    }
}
