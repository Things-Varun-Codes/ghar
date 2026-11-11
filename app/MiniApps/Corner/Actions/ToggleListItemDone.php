<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Concerns\ListItemContract;
use App\Shell\Models\User;

class ToggleListItemDone
{
    public function __invoke(ListItemContract $item, User $user): void
    {
        if ($item->done_at === null) {
            $item->markDone($user);

            return;
        }

        $item->markUndone();
    }
}
