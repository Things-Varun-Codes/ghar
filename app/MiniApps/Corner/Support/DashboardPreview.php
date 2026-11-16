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
        // Only link and poster lists store artwork, so any image is a cover.
        $images = Item::query()
            ->whereNotNull('image_url')
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(self::COVERS * 2)
            ->pluck('image_url')
            ->unique()
            ->take(self::COVERS)
            ->values()
            ->all();

        return $images === [] ? null : ['images' => $images];
    }
}
