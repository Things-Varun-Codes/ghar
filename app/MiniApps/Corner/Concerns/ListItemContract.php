<?php

namespace App\MiniApps\Corner\Concerns;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

interface ListItemContract
{
    public function markDone(User $user): void;

    public function markUndone(): void;

    public function addedBy(): BelongsTo;

    public function doneBy(): BelongsTo;
}
