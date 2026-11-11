<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Support\Str;

final class DashboardLine
{
    private const TITLE_LIMIT = 60;

    public static function forUser(User $user): ?string
    {
        $newest = null;

        foreach ([Song::class, Movie::class, Activity::class, Place::class] as $model) {
            $item = $model::query()
                ->orderByDesc('added_at')
                ->orderByDesc('id')
                ->first();

            if ($item === null) {
                continue;
            }

            if ($newest === null || $item->added_at->greaterThan($newest->added_at)) {
                $newest = $item;
            }
        }

        if ($newest === null) {
            return null;
        }

        return 'Latest: '.Str::limit(trim((string) $newest->title), self::TITLE_LIMIT);
    }
}
