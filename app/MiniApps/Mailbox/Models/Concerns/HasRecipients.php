<?php

namespace App\MiniApps\Mailbox\Models\Concerns;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;

/**
 * Recipients live in a per-type pivot carrying each recipient's own read_at. Every query a
 * viewer can reach starts with visibleTo() or receivedBy().
 */
trait HasRecipients
{
    /** @return BelongsToMany<User, $this> */
    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, static::RECIPIENTS_TABLE, static::RECIPIENTS_FOREIGN_KEY, 'user_id')
            ->withPivot('read_at')
            ->orderBy('users.name');
    }

    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        return $query->where(function (Builder $q) use ($viewer): void {
            $q->where($this->qualifyColumn('sender_id'), $viewer->id)
                ->orWhereExists($this->recipientRow($viewer));
        });
    }

    public function scopeReceivedBy(Builder $query, User $recipient): Builder
    {
        return $query->whereExists($this->recipientRow($recipient));
    }

    public function scopeUnreadBy(Builder $query, User $recipient): Builder
    {
        return $query->whereExists($this->recipientRow($recipient)->whereNull(static::RECIPIENTS_TABLE.'.read_at'));
    }

    public function isVisibleTo(User $viewer): bool
    {
        return $this->getAttribute('sender_id') === $viewer->id || $this->hasRecipient($viewer);
    }

    public function hasRecipient(User $user): bool
    {
        if ($this->relationLoaded('recipients')) {
            return $this->getRelation('recipients')->contains('id', $user->id);
        }

        return $this->recipients()->whereKey($user->id)->exists();
    }

    public function readAtFor(User $recipient): ?string
    {
        return DB::table(static::RECIPIENTS_TABLE)
            ->where(static::RECIPIENTS_FOREIGN_KEY, $this->getKey())
            ->where('user_id', $recipient->id)
            ->value('read_at');
    }

    public static function markAllReadFor(User $recipient): int
    {
        return DB::table(static::RECIPIENTS_TABLE)
            ->where('user_id', $recipient->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    private function recipientRow(User $user): \Illuminate\Database\Query\Builder
    {
        return DB::table(static::RECIPIENTS_TABLE)
            ->whereColumn(static::RECIPIENTS_TABLE.'.'.static::RECIPIENTS_FOREIGN_KEY, $this->getQualifiedKeyName())
            ->where(static::RECIPIENTS_TABLE.'.user_id', $user->id);
    }
}
