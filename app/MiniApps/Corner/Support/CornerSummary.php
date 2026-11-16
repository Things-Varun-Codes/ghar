<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Models\Activity;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Models\Place;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Everything on the Corner landing: a count, a done count and a peek per list. Corner items are
 * the whole household's, so nothing here is scoped to the viewer.
 */
class CornerSummary
{
    /** More than a door can show on a wide screen; the CSS clips what doesn't fit. */
    private const COVERS = 5;

    private const ACTIVITIES = 3;

    /**
     * @return array{
     *     counts: array{songs: int, movies: int, activities: int, places: int},
     *     done: array{songs: int, movies: int, activities: int, places: int},
     *     peeks: array{
     *         songs: array{images: list<string>},
     *         movies: array{images: list<string>},
     *         activities: array{items: list<array{title: string, done: bool}>},
     *         places: array{title: string, address: ?string}|null,
     *     },
     * }
     */
    public static function forUser(User $user): array
    {
        $tallies = [
            'songs' => self::tally(Song::query()),
            'movies' => self::tally(Movie::query()),
            'activities' => self::tally(Activity::query()),
            'places' => self::tally(Place::query()),
        ];

        $place = self::latest(Place::query())->first(['title', 'address']);

        return [
            'counts' => array_map(fn (array $t): int => $t['total'], $tallies),
            'done' => array_map(fn (array $t): int => $t['done'], $tallies),
            'peeks' => [
                'songs' => ['images' => self::covers(Song::query(), 'thumbnail_url')],
                'movies' => ['images' => self::covers(Movie::query(), 'poster_url')],
                'activities' => [
                    'items' => self::latest(Activity::query())
                        ->limit(self::ACTIVITIES)
                        ->get(['title', 'done_at'])
                        ->map(fn (Activity $a): array => ['title' => $a->title, 'done' => $a->done_at !== null])
                        ->all(),
                ],
                'places' => $place === null ? null : [
                    'title' => $place->title,
                    'address' => $place->address,
                ],
            ],
        ];
    }

    /** @return array{total: int, done: int} */
    private static function tally(Builder $query): array
    {
        $row = $query->toBase()
            ->selectRaw('count(*) as total, count(done_at) as done')
            ->first();

        return ['total' => (int) $row->total, 'done' => (int) $row->done];
    }

    /** @return list<string> */
    private static function covers(Builder $query, string $column): array
    {
        return self::latest($query)
            ->whereNotNull($column)
            ->limit(self::COVERS)
            ->pluck($column)
            ->all();
    }

    private static function latest(Builder $query): Builder
    {
        return $query->orderByDesc('added_at')->orderByDesc('id');
    }
}
