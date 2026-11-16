<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Item;
use Illuminate\Support\Facades\Gate;

class ItemResource
{
    /**
     * Every kind sends every field; the ones a kind doesn't use are null.
     *
     * @return array{
     *     id: int,
     *     title: string,
     *     notes: string|null,
     *     url: string|null,
     *     image_url: string|null,
     *     author: string|null,
     *     provider: string|null,
     *     place_id: string|null,
     *     lat: float|null,
     *     lng: float|null,
     *     address: string|null,
     *     added_at: string,
     *     done_at: string|null,
     *     is_done: bool,
     *     can: array{update: bool, delete: bool},
     *     added_by_user_id: int,
     *     addedBy: array{id: int, name: string},
     * }
     */
    public function __invoke(Item $item): array
    {
        $item->loadMissing('addedBy');

        return [
            'id' => $item->id,
            'title' => $item->title,
            'notes' => $item->notes,
            'url' => $item->url,
            'image_url' => $item->image_url,
            'author' => $item->author,
            'provider' => $item->provider,
            'place_id' => $item->place_id,
            'lat' => $item->lat === null ? null : (float) $item->lat,
            'lng' => $item->lng === null ? null : (float) $item->lng,
            'address' => $item->address,
            'added_at' => $item->added_at->toIso8601String(),
            'done_at' => $item->done_at?->toIso8601String(),
            'is_done' => $item->done_at !== null,
            'can' => [
                'update' => Gate::allows('update', $item),
                'delete' => Gate::allows('delete', $item),
            ],
            'added_by_user_id' => $item->added_by_user_id,
            'addedBy' => [
                'id' => $item->addedBy->id,
                'name' => $item->addedBy->name,
            ],
        ];
    }
}
