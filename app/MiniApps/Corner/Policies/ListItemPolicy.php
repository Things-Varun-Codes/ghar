<?php

namespace App\MiniApps\Corner\Policies;

use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;

class ListItemPolicy
{
    public function update(User $user, Item $item): bool
    {
        return $this->manages($user, $item);
    }

    public function delete(User $user, Item $item): bool
    {
        return $this->manages($user, $item);
    }

    public function toggleDone(User $user, Item $item): bool
    {
        return true;
    }

    private function manages(User $user, Item $item): bool
    {
        return $item->added_by_user_id === $user->id || $user->can('admin');
    }
}
