<?php

namespace App\MiniApps\Corner\Models;

use App\MiniApps\Corner\Concerns\ListItem;
use App\MiniApps\Corner\Concerns\ListItemContract;
use App\Shell\Models\User;
use Database\Factories\ActivityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string|null $notes
 * @property int $added_by_user_id
 * @property Carbon $added_at
 * @property Carbon|null $done_at
 * @property int|null $done_by_user_id
 * @property-read User $addedBy
 * @property-read User|null $doneBy
 */
#[Fillable([
    'title',
    'notes',
    'added_by_user_id',
    'added_at',
    'done_at',
    'done_by_user_id',
])]
class Activity extends Model implements ListItemContract
{
    use HasFactory;
    use ListItem;

    protected $table = 'corner_activities';

    protected static function newFactory(): ActivityFactory
    {
        return ActivityFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'added_at' => 'datetime',
            'done_at' => 'datetime',
        ];
    }
}
