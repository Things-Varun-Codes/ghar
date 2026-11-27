<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;

class CouponPolicy
{
    public function view(User $user, Coupon $coupon): bool
    {
        return $coupon->isParty($user);
    }

    public function request(User $user, Coupon $coupon): bool
    {
        // Nobody is left to honour it once the issuer is a former member.
        return $user->id === $coupon->recipient_id
            && ! $coupon->issuer->isFormer()
            && $coupon->status === Coupon::STATUS_ISSUED
            && $coupon->remaining() > 0
            && ! $coupon->isExpired();
    }

    public function cancel(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->recipient_id && $coupon->status === Coupon::STATUS_REQUESTED;
    }

    public function fulfill(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->issuer_id
            && ! $coupon->recipient->isFormer()
            && $coupon->status === Coupon::STATUS_REQUESTED;
    }

    public function delete(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->issuer_id && $coupon->status === Coupon::STATUS_ISSUED;
    }
}
