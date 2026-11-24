<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use App\Shell\Support\Person;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class ItemResource
{
    /**
     * Every item has the same parts; the ones it doesn't use are null.
     *
     * @return array<string, mixed>
     */
    public function __invoke(Item $item, ?User $viewer = null): array
    {
        $item->loadMissing(['list', 'addedBy', 'doneBy', 'markers']);
        $perPerson = $item->list->done_per_person;

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
            // On a per-person list, whether the viewer has marked it; otherwise whether anyone has.
            'is_done' => $perPerson
                ? $viewer !== null && $item->markers->contains('id', $viewer->id)
                : $item->done_at !== null,
            'can' => [
                'update' => Gate::allows('update', $item),
                'delete' => Gate::allows('delete', $item),
            ],
            'addedBy' => Person::short($item->addedBy),
            // Who has marked it done and on which day: one person on a shared list, everyone who
            // has on a per-person list, first to mark first.
            'done_by' => $perPerson
                ? $item->markers->map(fn (User $user): array => [
                    'person' => Person::short($user),
                    'on' => Carbon::parse((string) data_get($user, 'pivot.done_at'))->toDateString(),
                ])->values()->all()
                : ($item->done_at !== null && $item->doneBy !== null
                    ? [['person' => Person::short($item->doneBy), 'on' => $item->done_at->toDateString()]]
                    : []),
        ];
    }
}
