<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Movie;
use Illuminate\Support\Facades\Gate;

class MovieResource
{
    /**
     * @return array{
     *     id: int,
     *     title: string,
     *     poster_url: string|null,
     *     plex_url: string|null,
     *     added_at: string,
     *     done_at: string|null,
     *     is_watched: bool,
     *     is_done: bool,
     *     can: array{update: bool, delete: bool},
     *     added_by_user_id: int,
     *     addedBy: array{id: int, name: string},
     * }
     */
    public function __invoke(Movie $movie): array
    {
        $movie->loadMissing('addedBy');

        $isDone = $movie->done_at !== null;

        return [
            'id' => $movie->id,
            'title' => $movie->title,
            'poster_url' => $movie->poster_url,
            'plex_url' => $movie->plex_url,
            'added_at' => $movie->added_at->toIso8601String(),
            'done_at' => $movie->done_at?->toIso8601String(),
            'is_watched' => $isDone,
            'is_done' => $isDone,
            'can' => [
                'update' => Gate::allows('update', $movie),
                'delete' => Gate::allows('delete', $movie),
            ],
            'added_by_user_id' => $movie->added_by_user_id,
            'addedBy' => [
                'id' => $movie->addedBy->id,
                'name' => $movie->addedBy->name,
            ],
        ];
    }
}
