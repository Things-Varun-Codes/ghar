<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Item;
use Illuminate\Support\Facades\Gate;

class ItemResource
{
    /**
     * Every item has the same parts; the ones it doesn't use are null.
     *
     * @return array<string, mixed>
     */
    public function __invoke(Item $item): array
    {
        $item->loadMissing('addedBy');

        return [
            'id' => $item->id,
            'title' => $item->title,
            'notes' => $item->notes,
            'url' => $item->url,
            'site_name' => $item->site_name,
            'author' => $item->author,
            // Where the picture comes from, for the edit form; pages draw picture_url.
            'image_url' => $item->image_url,
            'picture_url' => $item->pictureUrl(),
            'location_label' => $item->location_label,
            'location_url' => $item->location_url,
            'lat' => $item->lat === null ? null : (float) $item->lat,
            'lng' => $item->lng === null ? null : (float) $item->lng,
            'address' => $item->address,
            'is_done' => $item->done_at !== null,
            'can' => [
                'update' => Gate::allows('update', $item),
                'delete' => Gate::allows('delete', $item),
            ],
            'addedBy' => [
                'id' => $item->addedBy->id,
                'name' => $item->addedBy->name,
            ],
        ];
    }
}
