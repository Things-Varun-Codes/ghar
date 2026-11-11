<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class FulfillCoupon
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(Coupon $coupon, User $actor): Coupon
    {
        // Locked and re-checked so a double submit can't spend two units.
        $coupon = DB::transaction(function () use ($coupon): Coupon {
            $locked = Coupon::query()->whereKey($coupon->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Coupon::STATUS_REQUESTED, 422, 'This coupon has no pending request to fulfill.');

            $locked->redeemed_count += 1;
            $locked->last_fulfilled_at = now();
            $locked->requested_at = null;
            $locked->status = $locked->remaining() > 0
                ? Coupon::STATUS_ISSUED
                : Coupon::STATUS_DEPLETED;
            $locked->save();

            return $locked;
        });

        $firstName = $actor->firstName();

        $this->dispatcher->toUsers(
            [$coupon->loadMissing('recipient')->recipient],
            'our-mailbox',
            'our-mailbox:coupons',
            "{$firstName} fulfilled your coupon",
            "/apps/our-mailbox/coupons/{$coupon->id}",
        );

        return $coupon;
    }
}
