<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
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
        $item->loadMissing(['addedBy', 'doneBy']);

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
            'addedBy' => self::person($item->addedBy),
            // Who marked it done, so a family can see whose "loved" or "visited" it is.
            'doneBy' => $item->done_at !== null && $item->doneBy !== null ? self::person($item->doneBy) : null,
            'done_on' => $item->done_at?->toDateString(),
        ];
    }

    /** @return array{id: int, name: string, avatar_url: string|null} */
    private static function person(User $user): array
    {
        return [...Person::of($user), 'name' => app(Household::class)->shortName($user)];
    }
}
