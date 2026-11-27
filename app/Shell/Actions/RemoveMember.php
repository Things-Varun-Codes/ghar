<?php

namespace App\Shell\Actions;

use App\Shell\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turns a member into a former member. The user row stays, so everything that names them keeps
 * naming them; the auth provider stops finding them, which ends their sign-in everywhere.
 */
class RemoveMember
{
    /** @throws AuthorizationException */
    public function __invoke(User $user): void
    {
        DB::transaction(function () use ($user) {
            // BlockLastAdminDemotion throws here if they are the last admin.
            $user->syncRoles([]);
            $user->forceFill([
                'removed_at' => now(),
                'remember_token' => Str::random(60),
            ])->save();

            DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            $user->pushSubscriptions()->delete();
        });
    }
}
