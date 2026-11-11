<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

class RecipientMailPolicy
{
    public function view(User $user, MailboxMessage|Bouquet $mail): bool
    {
        return $mail->isVisibleTo($user);
    }

    public function delete(User $user, MailboxMessage|Bouquet $mail): bool
    {
        return $mail->sender_id === $user->id;
    }
}
