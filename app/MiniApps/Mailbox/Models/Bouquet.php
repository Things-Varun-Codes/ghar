<?php

namespace App\MiniApps\Mailbox\Models;

use App\MiniApps\Mailbox\Models\Concerns\HasRecipients;
use App\Shell\Models\User;
use Database\Factories\BouquetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $sender_id
 * @property string|null $note optional personal note
 * @property string $image_key Object key on the media disk (never a signed URL)
 * @property array $flowers [{key, name, meaning}] — cast to array
 * @property Carbon $posted_at
 * @property-read User $sender
 * @property-read Collection<int, User> $recipients
 */
#[Fillable(['sender_id', 'note', 'image_key', 'flowers', 'posted_at'])]
class Bouquet extends Model
{
    use HasFactory;
    use HasRecipients;

    public const RECIPIENTS_TABLE = 'mailbox_bouquet_recipients';

    public const RECIPIENTS_FOREIGN_KEY = 'bouquet_id';

    protected $table = 'mailbox_bouquets';

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    protected static function booted(): void
    {
        static::deleting(function (Bouquet $bouquet): void {
            Storage::disk(config('services.bouquet.disk'))->delete($bouquet->image_key);
        });
    }

    protected static function newFactory(): BouquetFactory
    {
        return BouquetFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'flowers' => 'array',
        ];
    }
}
