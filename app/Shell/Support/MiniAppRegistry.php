<?php

namespace App\Shell\Support;

use App\Shell\Models\User;
use App\Shell\Services\Rooms;

class MiniAppRegistry
{
    /**
     * The rooms that are on and that this viewer may enter.
     *
     * @return list<array<string, mixed>>
     */
    public static function visibleFor(?User $user): array
    {
        return collect(app(Rooms::class)->enterableBy($user))
            ->map(fn (array $app): array => collect($app)->except('provider')->all())
            ->values()
            ->all();
    }
}
