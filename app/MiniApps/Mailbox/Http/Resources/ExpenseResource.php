<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseShare;

/** People are ids here; the page names them from its `people` prop. Needs `shares` loaded. */
class ExpenseResource
{
    /** @return array<string, mixed> */
    public function __invoke(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'title' => $expense->title,
            'amount' => $expense->amount,
            'spent_on' => $expense->spent_on->toDateString(),
            'split_mode' => $expense->split_mode,
            'is_settlement' => $expense->is_settlement,
            'paid_by_id' => $expense->paid_by_id,
            'shares' => $expense->shares
                ->map(fn (ExpenseShare $share): array => ['user_id' => $share->user_id, 'amount' => $share->amount])
                ->all(),
            'created_by_id' => $expense->created_by_id,
            'updated_by_id' => $expense->updated_by_id,
            'created_at' => $expense->created_at->toIso8601String(),
        ];
    }
}
