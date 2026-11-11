<?php

namespace App\MiniApps\Corner\Policies;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Model;

class ListItemPolicy
{
    public function update(User $user, Model $item): bool
    {
        return $this->manages($user, $item);
    }

    public function delete(User $user, Model $item): bool
    {
        return $this->manages($user, $item);
    }

    public function toggleDone(User $user, Model $item): bool
    {
        return true;
    }

    private function manages(User $user, Model $item): bool
    {
        return $item->getAttribute('added_by_user_id') === $user->id || $user->can('admin');
    }
}
