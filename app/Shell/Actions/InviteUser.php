<?php

namespace App\Shell\Actions;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Notifications\InvitationNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class InviteUser
{
    public function __invoke(
        User $inviter,
        string $email,
        string $roleName,
        ?int $expiryDays = 7
    ): Invitation {
        Invitation::pending()
            ->where('email', $email)
            ->update(['revoked_at' => now()]);

        $plaintext = Str::random(64);

        // token_hash isn't mass-assignable.
        $invitation = new Invitation([
            'email' => $email,
            'role_name' => $roleName,
            'expires_at' => now()->addDays($expiryDays),
            'invited_by_user_id' => $inviter->id,
        ]);
        $invitation->token_hash = hash('sha256', $plaintext);
        $invitation->save();

        Notification::route('mail', $email)
            ->notify(new InvitationNotification($invitation, $plaintext));

        return $invitation;
    }
}
