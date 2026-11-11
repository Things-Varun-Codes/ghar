<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Place;
use Illuminate\Support\Facades\Gate;

class PlaceResource
{
    /**
     * @return array{
     *     id: int,
     *     title: string,
     *     place_id: string|null,
     *     lat: float|null,
     *     lng: float|null,
     *     address: string|null,
     *     added_at: string,
     *     done_at: string|null,
     *     is_visited: bool,
     *     is_done: bool,
     *     can: array{update: bool, delete: bool},
     *     added_by_user_id: int,
     *     addedBy: array{id: int, name: string},
     * }
     */
    public function __invoke(Place $place): array
    {
        $place->loadMissing('addedBy');

        $isDone = $place->done_at !== null;

        return [
            'id' => $place->id,
            'title' => $place->title,
            'place_id' => $place->place_id,
            'lat' => $place->lat === null ? null : (float) $place->lat,
            'lng' => $place->lng === null ? null : (float) $place->lng,
            'address' => $place->address,
            'added_at' => $place->added_at->toIso8601String(),
            'done_at' => $place->done_at?->toIso8601String(),
            'is_visited' => $isDone,
            'is_done' => $isDone,
            'can' => [
                'update' => Gate::allows('update', $place),
                'delete' => Gate::allows('delete', $place),
            ],
            'added_by_user_id' => $place->added_by_user_id,
            'addedBy' => [
                'id' => $place->addedBy->id,
                'name' => $place->addedBy->name,
            ],
        ];
    }
}
