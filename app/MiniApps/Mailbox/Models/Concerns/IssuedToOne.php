<?php

namespace App\MiniApps\Mailbox\Models\Concerns;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One issuer, one recipient, both on the row. Every query a viewer can reach starts with
 * visibleTo(), issuedBy() or receivedBy().
 */
trait IssuedToOne
{
    /** @return BelongsTo<User, $this> */
    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issuer_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->where('issuer_id', $viewer->id)
            ->orWhere('recipient_id', $viewer->id));
    }

    public function scopeIssuedBy(Builder $query, User $issuer): Builder
    {
        return $query->where('issuer_id', $issuer->id);
    }

    public function scopeReceivedBy(Builder $query, User $recipient): Builder
    {
        return $query->where('recipient_id', $recipient->id);
    }

    public function isParty(User $user): bool
    {
        return $user->id === $this->getAttribute('issuer_id') || $user->id === $this->getAttribute('recipient_id');
    }
}
