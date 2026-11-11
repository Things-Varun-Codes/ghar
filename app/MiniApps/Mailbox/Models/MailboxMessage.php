<?php

namespace App\MiniApps\Mailbox\Models;

use App\MiniApps\Mailbox\Models\Concerns\HasRecipients;
use App\Shell\Models\User;
use Database\Factories\MailboxMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Push payloads never carry the body, so this table is the only place it lives.
 *
 * @property int $id
 * @property int $sender_id
 * @property string $body
 * @property Carbon $posted_at
 * @property-read User $sender
 * @property-read Collection<int, User> $recipients
 */
#[Fillable(['sender_id', 'body', 'posted_at'])]
class MailboxMessage extends Model
{
    use HasFactory;
    use HasRecipients;

    public const RECIPIENTS_TABLE = 'mailbox_message_recipients';

    public const RECIPIENTS_FOREIGN_KEY = 'message_id';

    protected $table = 'mailbox_messages';

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    protected static function newFactory(): MailboxMessageFactory
    {
        return MailboxMessageFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
        ];
    }
}
