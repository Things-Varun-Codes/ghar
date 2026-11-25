<?php

namespace App\MiniApps\Mailbox\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only here: Expense::writeShares() writes them.
 *
 * @property int $expense_id
 * @property int $user_id
 * @property int $amount
 */
class ExpenseShare extends Model
{
    protected $table = 'mailbox_expense_shares';

    public $timestamps = false;

    public $incrementing = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }
}
