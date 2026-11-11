<?php

namespace App\MiniApps\Corner\Models;

use App\MiniApps\Corner\Concerns\ListItem;
use App\MiniApps\Corner\Concerns\ListItemContract;
use App\Shell\Models\User;
use Database\Factories\PlaceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string|null $place_id
 * @property string|null $lat decimal(10,7), cast to string
 * @property string|null $lng decimal(10,7), cast to string
 * @property string|null $address
 * @property int $added_by_user_id
 * @property Carbon $added_at
 * @property Carbon|null $done_at
 * @property int|null $done_by_user_id
 * @property-read User $addedBy
 * @property-read User|null $doneBy
 */
#[Fillable([
    'title',
    'place_id',
    'lat',
    'lng',
    'address',
    'added_by_user_id',
    'added_at',
    'done_at',
    'done_by_user_id',
])]
class Place extends Model implements ListItemContract
{
    use HasFactory;
    use ListItem;

    protected $table = 'corner_places';

    protected static function newFactory(): PlaceFactory
    {
        return PlaceFactory::new();
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
