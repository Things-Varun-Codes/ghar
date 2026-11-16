<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddItem
{
    public function __construct(
        private readonly ItemDetails $details,
        private readonly PushDispatcher $dispatcher,
    ) {}

    /** @param  array<string, mixed>  $data validated against the list's kind */
    public function __invoke(CornerList $list, array $data, User $adder): Item
    {
        // Looked up before the transaction: it can be a slow network call.
        $attributes = $this->details->for($list->kind, $data);

        try {
            return DB::transaction(function () use ($list, $attributes, $adder): Item {
                $item = Item::create($attributes + [
                    'list_id' => $list->id,
                    'added_by_user_id' => $adder->id,
                    'added_at' => now(),
                ]);

                if ($list->notify_on_add) {
                    $body = "{$adder->firstName()} added to {$list->name}: {$item->title}";
                    $url = route('apps.our-corner.items.show', [$list->slug, $item->id], absolute: false);
                    $tag = "our-corner:{$list->slug}";

                    // Inside afterCommit so a rolled-back row is never pushed.
                    DB::afterCommit(function () use ($adder, $body, $url, $tag): void {
                        $this->dispatcher->toHousehold($adder, 'our-corner', $tag, $body, $url);
                    });
                }

                return $item;
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['url' => ItemDetails::DUPLICATE_LINK]);
        }
    }
}
