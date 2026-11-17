<?php

namespace App\MiniApps\Corner\Policies;

use App\MiniApps\Corner\Models\CornerList;
use App\Shell\Models\User;

/**
 * Anyone in the household may start a list or rearrange the shelf. Its settings belong to
 * whoever made it, or an admin.
 */
class CornerListPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function reorder(User $user): bool
    {
        return true;
    }

    public function update(User $user, CornerList $list): bool
    {
        return $this->manages($user, $list);
    }

    public function delete(User $user, CornerList $list): bool
    {
        return self::mayDelete($user, $list, $list->itemsAddedByOthersThan($user));
    }

    /**
     * Deleting a list deletes what is in it, so its maker may only do that while everything
     * in it is theirs to delete anyway. Once someone else has added to it, it takes an admin.
     */
    public static function mayDelete(User $user, CornerList $list, int $itemsByOthers): bool
    {
        if ($itemsByOthers === 0) {
            return $user->makerOrAdmin($list->created_by_user_id);
        }

        return $user->can('admin');
    }

    private function manages(User $user, CornerList $list): bool
    {
        return $user->makerOrAdmin($list->created_by_user_id);
    }
}
