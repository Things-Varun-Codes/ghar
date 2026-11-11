<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

class CancelRequest
{
    public function __invoke(Coupon $coupon, User $actor): Coupon
    {
        // Locked and re-checked so it can't race a fulfil of the same request.
        return DB::transaction(function () use ($coupon): Coupon {
            $locked = Coupon::query()->whereKey($coupon->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Coupon::STATUS_REQUESTED, 422, 'There is no pending request to cancel.');

            $locked->status = Coupon::STATUS_ISSUED;
            $locked->requested_at = null;
            $locked->save();

            return $locked;
        });
    }
}
