<?php

namespace App\Shell\Support;

use App\Shell\Models\User;

class MiniAppRegistry
{
    /** @return list<array<string, mixed>> */
    public static function visibleFor(?User $user, ?bool $isAdmin = null): array
    {
        if ($isAdmin === null) {
            $user?->loadMissing('roles');
            $isAdmin = (bool) $user?->hasRole('admin');
        }

        return collect(config('miniapps', []))
            ->filter(fn ($app) => ! empty($app['enabled']))
            ->reject(fn ($app) => ! empty($app['admin_only']) && ! $isAdmin)
            ->values()
            ->all();
    }
}
