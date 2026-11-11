<?php

namespace App\MiniApps\History\Models;

use App\Shell\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only. event_id has no cascade, so entries outlive the event; user_id is set null,
 * so they outlive the user.
 *
 * @property int $id
 * @property int|null $event_id — null when the parent Event has been hard-deleted (or pruned by media:prune)
 * @property int|null $user_id
 * @property string $action ('create' | 'edit' | 'delete')
 * @property string $summary
 * @property array|null $changes
 * @property CarbonInterface $created_at
 * @property-read Event|null $event
 * @property-read User|null $user
 */
#[Fillable([
    'event_id',
    'user_id',
    'action',
    'summary',
    'changes',
    'created_at',
])]
class EventChange extends Model
{
    public $timestamps = false;

    protected $table = 'our_history_event_changes';

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
