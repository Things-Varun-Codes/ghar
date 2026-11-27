<?php

namespace App\MiniApps\Corner\Models;

use App\Shell\Models\User;
use Database\Factories\CornerListFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $icon
 * @property string $done_label
 * @property string $todo_label
 * @property string $done_icon
 * @property bool $notify_on_add
 * @property bool $done_per_person each person marks a thing done for themselves
 * @property int|null $created_by_user_id
 * @property Carbon $created_at
 * @property-read User|null $createdBy
 * @property-read Collection<int, Item> $items
 */
#[Fillable([
    'name',
    'slug',
    'icon',
    'done_label',
    'todo_label',
    'done_icon',
    'notify_on_add',
    'done_per_person',
    'created_by_user_id',
])]
class CornerList extends Model
{
    /** Whose order is whose: see PersonalOrder. */
    public const ORDER_SCOPE = 'our-shelf.lists';

    /** @use HasFactory<CornerListFactory> */
    use HasFactory;

    protected $table = 'corner_lists';

    protected static function newFactory(): CornerListFactory
    {
        return CornerListFactory::new();
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return HasMany<Item, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'list_id');
    }

    /** How many things in the list someone else added: its maker may delete it only at 0. */
    public function itemsAddedByOthersThan(User $user): int
    {
        return $this->items()->where('added_by_user_id', '!=', $user->id)->count();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'notify_on_add' => 'boolean',
            'done_per_person' => 'boolean',
        ];
    }
}
