<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;

class MarkBouquetsRead
{
    public function __invoke(User $recipient): int
    {
        return Bouquet::markAllReadFor($recipient);
    }
}
