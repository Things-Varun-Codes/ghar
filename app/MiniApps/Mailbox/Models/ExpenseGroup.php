<?php

namespace App\MiniApps\Mailbox\Models;

use App\Shell\Models\User;
use App\Shell\Services\Household;
use Carbon\CarbonImmutable;
use Database\Factories\ExpenseGroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The people who split expenses together. Only its members see a group or anything in it, and an
 * admin is no exception: every query a viewer can reach starts with visibleTo(). General has no
 * member rows; everyone in the household is in it.
 *
 * @property int $id
 * @property string $name
 * @property bool $is_general
 * @property int|null $created_by_id
 * @property CarbonImmutable|null $archived_at
 */
#[Fillable(['name'])]
class ExpenseGroup extends Model
{
    use HasFactory;

    protected $table = 'mailbox_expense_groups';

    protected static function newFactory(): ExpenseGroupFactory
    {
        return ExpenseGroupFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_general' => 'boolean',
            'archived_at' => 'immutable_datetime',
        ];
    }

    public static function general(): self
    {
        return self::query()->where('is_general', true)->firstOrFail();
    }

    /** @return BelongsToMany<User, $this> */
    public function memberRows(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'mailbox_expense_group_members', 'group_id', 'user_id');
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'group_id');
    }

    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        return $query->where(function (Builder $q) use ($viewer): void {
            $q->where($this->qualifyColumn('is_general'), true)
                ->orWhereHas('memberRows', fn (Builder $members) => $members->whereKey($viewer->id));
        });
    }

    /** @return list<int> in id order */
    public function memberIds(): array
    {
        if ($this->is_general) {
            return self::ids(app(Household::class)->query()->pluck('id')->all());
        }

        return self::ids($this->relationLoaded('memberRows')
            ? $this->memberRows->modelKeys()
            : $this->memberRows()->pluck('users.id')->all());
    }

    /** @return Collection<int, User> */
    public function members(): Collection
    {
        return app(Household::class)->members()->whereIn('id', $this->memberIds())->values();
    }

    public function hasMember(User $user): bool
    {
        return $this->is_general || in_array($user->id, $this->memberIds(), true);
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private static function ids(array $ids): array
    {
        $ids = array_map(intval(...), $ids);
        sort($ids);

        return $ids;
    }
}
