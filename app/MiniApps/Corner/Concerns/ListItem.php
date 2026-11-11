<?php

namespace App\MiniApps\Corner\Concerns;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait ListItem
{
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by_user_id');
    }

    public function doneBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'done_by_user_id');
    }

    public function markDone(User $user): void
    {
        $this->update([
            'done_at' => now(),
            'done_by_user_id' => $user->id,
        ]);
    }

    public function markUndone(): void
    {
        $this->update([
            'done_at' => null,
            'done_by_user_id' => null,
        ]);
    }
}
