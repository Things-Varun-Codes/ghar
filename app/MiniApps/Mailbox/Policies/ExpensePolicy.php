<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Expense;
use App\Shell\Models\User;

class ExpensePolicy
{
    /** Edit, delete or restore it: anyone in its group. */
    public function update(User $user, Expense $expense): bool
    {
        return $expense->group->hasMember($user);
    }
}
