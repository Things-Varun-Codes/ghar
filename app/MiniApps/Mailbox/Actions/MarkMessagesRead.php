<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

class MarkMessagesRead
{
    public function __invoke(User $recipient): int
    {
        return MailboxMessage::markAllReadFor($recipient);
    }
}
