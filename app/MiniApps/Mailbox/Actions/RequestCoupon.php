<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class RequestCoupon
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(Coupon $coupon, User $actor): Coupon
    {
        // Locked and re-checked so a double submit can't push twice.
        $coupon = DB::transaction(function () use ($coupon): Coupon {
            $locked = Coupon::query()->whereKey($coupon->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Coupon::STATUS_ISSUED, 422, 'This coupon can no longer be requested.');

            $locked->status = Coupon::STATUS_REQUESTED;
            $locked->requested_at = now();
            $locked->save();

            return $locked;
        });

        $firstName = $actor->firstName();

        $this->dispatcher->toUsers(
            [$coupon->loadMissing('issuer')->issuer],
            'our-mailbox',
            'our-mailbox:coupons',
            "{$firstName} requested a coupon",
            "/apps/our-mailbox/coupons/{$coupon->id}",
        );

        return $coupon;
    }
}
