<?php

namespace App\Shell\Observers;

use App\Shell\Actions\ProfilePicture;
use App\Shell\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/**
 * The last-admin check lives in UsersController: Spatie's deleting hook has already detached
 * the roles by the time this runs.
 */
class UserObserver
{
    public function deleting(User $user): void
    {
        /** @var User|null $actingUser */
        $actingUser = auth()->user();

        if ($actingUser && $actingUser->id === $user->id) {
            throw new AuthorizationException('You cannot delete your own account.');
        }
    }

    public function deleted(User $user): void
    {
        $key = $user->avatar_key;

        // After commit, so a delete that rolls back keeps its picture.
        DB::afterCommit(fn () => app(ProfilePicture::class)->deleteObject($key));
    }
}
