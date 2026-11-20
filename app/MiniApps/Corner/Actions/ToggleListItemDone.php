<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

class ToggleListItemDone
{
    public function __invoke(Item $item, User $user): void
    {
        $item->loadMissing('list');

        if ($item->list->done_per_person) {
            $this->toggleMine($item, $user);

            return;
        }

        if ($item->done_at === null) {
            $item->markDone($user);

            return;
        }

        $item->markUndone();
    }

    /** On a per-person list only the viewer's own mark changes; nobody else's. */
    private function toggleMine(Item $item, User $user): void
    {
        $mine = DB::table('corner_item_marks')->where('item_id', $item->id)->where('user_id', $user->id);

        if ($mine->exists()) {
            $mine->delete();

            return;
        }

        DB::table('corner_item_marks')->insertOrIgnore([
            'item_id' => $item->id,
            'user_id' => $user->id,
            'done_at' => now(),
        ]);
    }
}
