<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;

class CitationPolicy
{
    public function view(User $user, Citation $citation): bool
    {
        return $citation->isParty($user);
    }

    public function pay(User $user, Citation $citation): bool
    {
        // Nobody is left to pay once the issuer is a former member.
        return $user->id === $citation->recipient_id
            && ! $citation->issuer->isFormer()
            && $citation->status === Citation::STATUS_ISSUED;
    }

    public function delete(User $user, Citation $citation): bool
    {
        return $user->id === $citation->issuer_id && $citation->status === Citation::STATUS_ISSUED;
    }
}
