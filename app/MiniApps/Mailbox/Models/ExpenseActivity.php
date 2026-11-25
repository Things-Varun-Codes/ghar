<?php

namespace App\MiniApps\Mailbox\Models;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * What happened in a group, one row per change, written in the change's own transaction.
 *
 * @property int $id
 * @property int $group_id
 * @property int $actor_id
 * @property string $action
 * @property int|null $expense_id
 * @property array<string, mixed>|null $data
 * @property CarbonImmutable $created_at
 * @property-read User $actor
 */
#[Fillable(['group_id', 'actor_id', 'action', 'expense_id', 'data'])]
class ExpenseActivity extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'mailbox_expense_activity';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'created_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @param  array<string, mixed>  $data */
    public static function log(int $groupId, User $actor, string $action, ?int $expenseId = null, array $data = []): void
    {
        self::query()->create([
            'group_id' => $groupId,
            'actor_id' => $actor->id,
            'action' => $action,
            'expense_id' => $expenseId,
            'data' => $data,
        ]);
    }
}
