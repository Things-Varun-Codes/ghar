<?php

namespace App\Shell\Listeners;

use App\Shell\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Spatie\Permission\Events\RoleDetachedEvent;

/**
 * Fires inside syncRoles()/removeRole(), before the surrounding transaction commits, so
 * throwing rolls back the detach.
 */
class BlockLastAdminDemotion
{
    public function handle(RoleDetachedEvent $event): void
    {
        $roleNames = $this->resolveRoleNames($event->rolesOrIds);

        if (! in_array('admin', $roleNames, true)) {
            return;
        }

        if (User::role('admin')->count() < 1) {
            throw new AuthorizationException('Cannot demote the last admin.');
        }
    }

    private function resolveRoleNames(mixed $rolesOrIds): array
    {
        if ($rolesOrIds instanceof \Illuminate\Support\Collection) {
            $rolesOrIds = $rolesOrIds->all();
        }

        if (! is_array($rolesOrIds)) {
            $rolesOrIds = [$rolesOrIds];
        }

        return array_values(array_filter(array_map(function ($item) {
            if ($item instanceof \Spatie\Permission\Models\Role) {
                return $item->name;
            }
            // ID before is_string: a numeric string like "3" satisfies both and must be
            // treated as an id.
            if (is_int($item) || (is_string($item) && ctype_digit($item))) {
                $role = \Spatie\Permission\Models\Role::find($item);

                return $role?->name;
            }
            if (is_string($item)) {
                return $item;
            }

            return null;
        }, $rolesOrIds)));
    }
}
