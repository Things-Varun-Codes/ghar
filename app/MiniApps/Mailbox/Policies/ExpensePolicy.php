<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Expense;
use App\Shell\Models\User;

class ExpensePolicy
{
    /** See it and what has happened to it: anyone in its group, and nobody else. */
    public function view(User $user, Expense $expense): bool
    {
        return $expense->group->hasMember($user);
    }

    /** Edit, delete or restore it: anyone in its group. */
    public function update(User $user, Expense $expense): bool
    {
        return $expense->group->hasMember($user);
    }
}
