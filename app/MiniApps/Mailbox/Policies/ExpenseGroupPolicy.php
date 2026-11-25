<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\Shell\Models\User;

/** Membership is the whole rule: an admin who isn't in a group has no way in. */
class ExpenseGroupPolicy
{
    /** See it, add to it, settle in it. */
    public function view(User $user, ExpenseGroup $group): bool
    {
        return $group->hasMember($user);
    }

    /** Rename it, change who is in it, archive or delete it. General is fixed. */
    public function manage(User $user, ExpenseGroup $group): bool
    {
        return ! $group->is_general && $group->hasMember($user);
    }
}
