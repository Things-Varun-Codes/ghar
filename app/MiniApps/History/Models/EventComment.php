<?php

namespace App\MiniApps\History\Models;

use App\Shell\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\EventCommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Plain text, never edited: written once, deleted by its author or an admin.
 *
 * @property int $id
 * @property int $event_id
 * @property int|null $author_id null once the author's account is gone
 * @property string $body
 * @property CarbonInterface $created_at
 * @property-read Event $event
 * @property-read User|null $author
 */
#[Fillable(['event_id', 'author_id', 'body'])]
class EventComment extends Model
{
    use HasFactory;

    public const MAX_LENGTH = 2000;

    public const UPDATED_AT = null;

    protected $table = 'our_history_event_comments';

    protected static function newFactory(): EventCommentFactory
    {
        return EventCommentFactory::new();
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
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
