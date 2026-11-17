<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

class FulfillCoupon
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    public function __invoke(Coupon $coupon, User $actor): Coupon
    {
        // Locked and re-checked so a double submit can't spend two units.
        $coupon = DB::transaction(function () use ($coupon): Coupon {
            $locked = Coupon::query()->whereKey($coupon->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Coupon::STATUS_REQUESTED, 422, 'This coupon has no pending request to fulfil.');

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

        $this->push->toEntry(
            [$coupon->loadMissing('recipient')->recipient],
            EntryTypes::COUPONS,
            $coupon->id,
            "{$firstName} fulfilled your coupon",
        );

        return $coupon;
    }
}
