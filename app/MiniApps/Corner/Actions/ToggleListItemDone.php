<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;

class ToggleListItemDone
{
    public function __invoke(Item $item, User $user): void
    {
        if ($item->done_at === null) {
            $item->markDone($user);

            return;
        }

        $item->markUndone();
    }
}
