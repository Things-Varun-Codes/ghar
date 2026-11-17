<?php

namespace App\MiniApps\Corner\Models;

use App\Shell\Models\User;
use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $list_id
 * @property string $title
 * @property string|null $notes
 * @property string|null $url
 * @property string|null $image_url
 * @property string|null $author
 * @property string|null $url_key
 * @property string|null $site_name
 * @property string|null $location_label
 * @property string|null $location_url
 * @property string|null $place_id
 * @property string|null $lat decimal(10,7), cast to string
 * @property string|null $lng decimal(10,7), cast to string
 * @property string|null $address
 * @property string|null $legacy_type
 * @property int|null $legacy_id
 * @property int $added_by_user_id
 * @property Carbon $added_at
 * @property Carbon|null $done_at
 * @property int|null $done_by_user_id
 * @property-read CornerList $list
 * @property-read User $addedBy
 * @property-read User|null $doneBy
 */
#[Fillable([
    'list_id',
    'title',
    'notes',
    'url',
    'image_url',
    'author',
    'url_key',
    'site_name',
    'location_label',
    'location_url',
    'place_id',
    'lat',
    'lng',
    'address',
    'legacy_type',
    'legacy_id',
    'added_by_user_id',
    'added_at',
    'done_at',
    'done_by_user_id',
])]
class Item extends Model
{
    /** @use HasFactory<ItemFactory> */
    use HasFactory;

    protected $table = 'corner_items';

    protected static function newFactory(): ItemFactory
    {
        return ItemFactory::new();
    }

    /** @return BelongsTo<CornerList, $this> */
    public function list(): BelongsTo
    {
        return $this->belongsTo(CornerList::class, 'list_id');
    }

    /** @return BelongsTo<User, $this> */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function doneBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'done_by_user_id');
    }

    /**
     * The address a page draws the picture from: the picture route, whose address changes when
     * the picture does, so browsers can keep it.
     */
    public function pictureUrl(): ?string
    {
        return self::pictureUrlFor($this->id, $this->image_url);
    }

    public static function pictureUrlFor(int $id, ?string $source): ?string
    {
        if ($source === null || $source === '') {
            return null;
        }

        return route('apps.our-corner.items.picture', [
            'item' => $id,
            'v' => substr(hash('sha256', $source), 0, 12),
        ], absolute: false);
    }

    public function markDone(User $user): void
    {
        $this->update(['done_at' => now(), 'done_by_user_id' => $user->id]);
    }

    public function markUndone(): void
    {
        $this->update(['done_at' => null, 'done_by_user_id' => null]);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'added_at' => 'datetime',
            'done_at' => 'datetime',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }
}
