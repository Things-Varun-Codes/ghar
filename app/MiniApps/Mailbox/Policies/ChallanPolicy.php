<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;

class ChallanPolicy
{
    public function view(User $user, Challan $challan): bool
    {
        return $user->id === $challan->issuer_id || $user->id === $challan->recipient_id;
    }

    public function pay(User $user, Challan $challan): bool
    {
        return $user->id === $challan->recipient_id && $challan->status === Challan::STATUS_ISSUED;
    }

    public function delete(User $user, Challan $challan): bool
    {
        return $user->id === $challan->issuer_id && $challan->status === Challan::STATUS_ISSUED;
    }
}
