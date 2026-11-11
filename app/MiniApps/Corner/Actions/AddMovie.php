<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Services\MoviePosterResolver;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class AddMovie
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
        private readonly MoviePosterResolver $posterResolver,
    ) {}

    /** @param  array{title: string, plex_url?: string|null}  $data */
    public function __invoke(array $data, User $adder): Movie
    {
        $posterUrl = ($this->posterResolver)($data['plex_url'] ?? null);

        return DB::transaction(function () use ($data, $adder, $posterUrl): Movie {
            $movie = Movie::create([
                'title' => $data['title'],
                'poster_url' => $posterUrl,
                'plex_url' => $data['plex_url'] ?? null,
                'added_by_user_id' => $adder->id,
                'added_at' => now(),
            ]);

            // Inside afterCommit so a rolled-back row is never pushed.
            if (config('corner-lists.movies.push_on_add', true)) {
                $firstName = $adder->firstName();
                $body = "{$firstName} added a movie: {$movie->title}";

                DB::afterCommit(function () use ($adder, $body): void {
                    $this->dispatcher->toHousehold(
                        $adder,
                        'our-corner',
                        'our-corner:movies',
                        $body,
                        '/apps/our-corner/movies',
                    );
                });
            }

            return $movie;
        });
    }
}
