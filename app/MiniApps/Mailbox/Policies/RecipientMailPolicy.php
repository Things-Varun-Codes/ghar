<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;

class RecipientMailPolicy
{
    public function view(User $user, MailboxMessage|Postcard $mail): bool
    {
        return $mail->isVisibleTo($user);
    }

    public function delete(User $user, MailboxMessage|Postcard $mail): bool
    {
        return $mail->sender_id === $user->id;
    }
}
