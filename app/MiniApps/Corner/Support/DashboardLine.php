<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Illuminate\Support\Str;

final class DashboardLine
{
    private const TITLE_LIMIT = 60;

    public static function forUser(User $user): ?string
    {
        $newest = Item::query()
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->first(['title']);

        if ($newest === null) {
            return null;
        }

        return 'Latest: '.Str::limit(trim($newest->title), self::TITLE_LIMIT);
    }
}
