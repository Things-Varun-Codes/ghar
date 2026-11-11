<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;

class CornerSummary
{
    /**
     * @return array{
     *     counts: array{songs: int, movies: int, activities: int, places: int},
     * }
     */
    public static function forUser(User $user): array
    {
        return [
            'counts' => [
                'songs' => Song::count(),
                'movies' => Movie::count(),
                'activities' => Activity::count(),
                'places' => Place::count(),
            ],
            'peeks' => [
                'songs' => self::covers(Song::query(), 'thumbnail_url'),
                'movies' => self::covers(Movie::query(), 'poster_url'),
                'activities' => self::latestTitle(Activity::query()),
                'places' => self::latestTitle(Place::query()),
            ],
        ];
    }

    /** @return array{images: list<string>} */
    private static function covers(Builder $query, string $column): array
    {
        return [
            'images' => $query
                ->whereNotNull($column)
                ->orderByDesc('added_at')
                ->orderByDesc('id')
                ->limit(3)
                ->pluck($column)
                ->all(),
        ];
    }

    /** @return array{title: ?string} */
    private static function latestTitle(Builder $query): array
    {
        return [
            'title' => $query
                ->orderByDesc('added_at')
                ->orderByDesc('id')
                ->value('title'),
        ];
    }
}
