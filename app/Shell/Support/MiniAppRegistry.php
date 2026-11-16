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
    public static function visibleFor(?User $user, ?bool $isAdmin = null): array
    {
        if ($isAdmin === null) {
            $user?->loadMissing('roles');
            $isAdmin = (bool) $user?->hasRole('admin');
        }

        $rooms = app(Rooms::class);

        return collect($rooms->installed())
            ->filter(fn (array $app): bool => $rooms->isOn($app['slug']))
            ->reject(fn (array $app): bool => ! empty($app['admin_only']) && ! $isAdmin)
            ->map(fn (array $app): array => collect($app)->except('provider')->all())
            ->values()
            ->all();
    }
}
