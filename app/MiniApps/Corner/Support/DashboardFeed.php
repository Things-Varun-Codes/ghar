<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
use Carbon\CarbonImmutable;

/** Home's "New this week" rows: things other members put on a list since $since. */
final class DashboardFeed
{
    private const LIMIT = 8;

    /** @return list<array<string, mixed>> */
    public static function forUser(User $user, CarbonImmutable $since): array
    {
        return Item::query()
            ->where('added_at', '>=', $since)
            ->where('added_by_user_id', '!=', $user->id)
            ->with(['addedBy', 'list'])
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Item $item): array => [
                'kind' => 'new',
                'title' => app(Household::class)->shortName($item->addedBy).' added to '.$item->list->name,
                'detail' => $item->title,
                'at' => $item->added_at->toIso8601String(),
                'href' => route('apps.our-shelf.items.show', [$item->list->slug, $item->id], absolute: false),
                'action' => null,
                'person' => Person::of($item->addedBy),
                'image' => $item->pictureUrl(),
            ])
            ->values()
            ->all();
    }
}
