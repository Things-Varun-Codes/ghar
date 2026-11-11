<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Song;
use Illuminate\Support\Facades\Gate;

class SongResource
{
    /**
     * @return array{
     *     id: int,
     *     provider: string,
     *     provider_id: string,
     *     title: string,
     *     author: string|null,
     *     url: string,
     *     thumbnail_url: string|null,
     *     added_at: string,
     *     done_at: string|null,
     *     is_loved: bool,
     *     can: array{update: bool, delete: bool},
     *     added_by_user_id: int,
     *     addedBy: array{id: int, name: string},
     * }
     */
    public function __invoke(Song $song): array
    {
        $song->loadMissing('addedBy');

        return [
            'id' => $song->id,
            'provider' => $song->provider,
            'provider_id' => $song->provider_id,
            'title' => $song->title,
            'author' => $song->author,
            'url' => $song->url,
            'thumbnail_url' => $song->thumbnail_url,
            'added_at' => $song->added_at->toIso8601String(),
            'done_at' => $song->done_at?->toIso8601String(),
            'is_loved' => $song->done_at !== null,
            'can' => [
                'update' => Gate::allows('update', $song),
                'delete' => Gate::allows('delete', $song),
            ],
            'added_by_user_id' => $song->added_by_user_id,
            'addedBy' => [
                'id' => $song->addedBy->id,
                'name' => $song->addedBy->name,
            ],
        ];
    }
}
