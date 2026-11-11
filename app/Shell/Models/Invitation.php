<?php

namespace App\Shell\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $email
 * @property string $role_name
 * @property string $token_hash
 * @property \Carbon\CarbonInterface $expires_at
 * @property int $invited_by_user_id
 * @property \Carbon\CarbonInterface|null $accepted_at
 * @property \Carbon\CarbonInterface|null $revoked_at
 * @property \Carbon\CarbonInterface $created_at
 * @property \Carbon\CarbonInterface $updated_at
 */
// token_hash, accepted_at and revoked_at decide whether a token is valid, so they must never
// be reachable from request-shaped input.
#[Fillable(['email', 'role_name', 'expires_at', 'invited_by_user_id'])]
#[Hidden(['token_hash'])]
class Invitation extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function scopePending($query)
    {
        return $query
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now());
    }

    /** @return BelongsTo<User, $this> */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }
}
