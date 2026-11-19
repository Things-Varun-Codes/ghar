<?php

namespace App\MiniApps\History\Models;

use App\Shell\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\EventReactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person's one emoji on a moment; each person toggles each of the set on its own.
 *
 * @property int $id
 * @property int $event_id
 * @property int $user_id
 * @property string $reaction a key of EMOJI
 * @property CarbonInterface $created_at
 * @property-read Event $event
 * @property-read User $user
 */
#[Fillable(['event_id', 'user_id', 'reaction'])]
class EventReaction extends Model
{
    use HasFactory;

    /** The fixed set, in the order the sheet shows it. The key is what's stored and routed. */
    public const EMOJI = [
        'heart' => '❤️',
        'laugh' => '😂',
        'wow' => '😮',
        'sad' => '😢',
        'pray' => '🙏',
        'party' => '🎉',
    ];

    public const UPDATED_AT = null;

    protected $table = 'our_history_event_reactions';

    protected static function newFactory(): EventReactionFactory
    {
        return EventReactionFactory::new();
    }

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::EMOJI);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
