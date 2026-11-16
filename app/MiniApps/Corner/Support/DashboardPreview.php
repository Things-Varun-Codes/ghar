<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;

final class DashboardPreview
{
    private const COVERS = 4;

    /** @return array{images: list<string>}|null */
    public static function forUser(User $user): ?array
    {
        $images = Item::query()
            ->whereNotNull('image_url')
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(self::COVERS * 2)
            ->get(['id', 'image_url'])
            // One picture shown once, however many items share it.
            ->unique('image_url')
            ->take(self::COVERS)
            ->map(fn (Item $item): ?string => $item->pictureUrl())
            ->filter()
            ->values()
            ->all();

        return $images === [] ? null : ['images' => $images];
    }
}
