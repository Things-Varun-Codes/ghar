<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;

final class DashboardPreview
{
    private const COVERS = 4;

    /** @return array{images: list<string>}|null */
    public static function forUser(User $user): ?array
    {
        $songs = Song::query()
            ->whereNotNull('thumbnail_url')
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(self::COVERS)
            ->get()
            ->map(fn (Song $song) => ['at' => $song->added_at, 'url' => $song->thumbnail_url]);

        $movies = Movie::query()
            ->whereNotNull('poster_url')
            ->orderByDesc('added_at')
            ->orderByDesc('id')
            ->limit(self::COVERS)
            ->get()
            ->map(fn (Movie $movie) => ['at' => $movie->added_at, 'url' => $movie->poster_url]);

        $images = $songs->concat($movies)
            ->sortByDesc('at')
            ->pluck('url')
            ->unique()
            ->take(self::COVERS)
            ->values()
            ->all();

        return $images === [] ? null : ['images' => $images];
    }
}
