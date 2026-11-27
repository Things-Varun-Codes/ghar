<?php

namespace App\MiniApps\Mailbox\Models;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * One thing paid for, or one repayment (is_settlement: paid_by paid, the single share received).
 * `amount` and every share are whole minor units; the shares always add up to the amount.
 *
 * @property int $id
 * @property int $group_id
 * @property int $paid_by_id
 * @property int $created_by_id
 * @property int|null $updated_by_id
 * @property string $title
 * @property int $amount
 * @property CarbonImmutable $spent_on
 * @property string $split_mode
 * @property string|null $icon
 * @property bool $is_settlement
 * @property CarbonImmutable|null $deleted_at
 * @property int|null $deleted_by_id
 * @property CarbonImmutable $created_at
 * @property-read ExpenseGroup $group
 * @property-read Collection<int, ExpenseShare> $shares
 */
#[Fillable(['title', 'amount', 'spent_on', 'split_mode', 'paid_by_id', 'icon'])]
class Expense extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const SPLIT_EQUAL = 'equal';

    public const SPLIT_EXACT = 'exact';

    /** 999,999,999.99 in a two-decimal currency: far below what a JavaScript number holds exactly. */
    public const MAX_AMOUNT = 99_999_999_999;

    protected $table = 'mailbox_expenses';

    protected static function newFactory(): ExpenseFactory
    {
        return ExpenseFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'spent_on' => 'immutable_date',
            'is_settlement' => 'boolean',
            'deleted_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<ExpenseGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ExpenseGroup::class, 'group_id');
    }

    /** @return HasMany<ExpenseShare, $this> */
    public function shares(): HasMany
    {
        return $this->hasMany(ExpenseShare::class, 'expense_id')->orderBy('user_id');
    }

    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        return $query->whereIn($this->qualifyColumn('group_id'), ExpenseGroup::query()->visibleTo($viewer)->select('id'));
    }

    /** @return array<int, int> user id => share, in id order */
    public function shareMap(): array
    {
        return $this->shares()->pluck('amount', 'user_id')->map(intval(...))->all();
    }

    /**
     * Replaces the shares. They have a two-column key, so they are written as plain rows.
     *
     * @param  array<int, int>  $shares  user id => share
     */
    public function writeShares(array $shares): void
    {
        $rows = DB::table('mailbox_expense_shares');
        $rows->clone()->where('expense_id', $this->id)->delete();

        $rows->insert(array_map(
            fn (int $userId, int $amount): array => ['expense_id' => $this->id, 'user_id' => $userId, 'amount' => $amount],
            array_keys($shares),
            $shares,
        ));
    }
}
