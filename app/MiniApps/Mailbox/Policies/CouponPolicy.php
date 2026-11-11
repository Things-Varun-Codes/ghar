<?php

namespace App\MiniApps\Mailbox\Policies;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;

class CouponPolicy
{
    public function view(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->issuer_id || $user->id === $coupon->recipient_id;
    }

    public function request(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->recipient_id
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
        return $user->id === $coupon->issuer_id && $coupon->status === Coupon::STATUS_REQUESTED;
    }

    public function delete(User $user, Coupon $coupon): bool
    {
        return $user->id === $coupon->issuer_id && $coupon->status === Coupon::STATUS_ISSUED;
    }
}
