<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueCouponRequest;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\Shell\Models\User;
use Illuminate\Support\Collection;

/** @extends IssueToEachRecipient<Coupon> */
class IssueCoupon extends IssueToEachRecipient
{
    /** @return Collection<int, Coupon> */
    public function __invoke(IssueCouponRequest $request, User $issuer): Collection
    {
        return $this->issue($request, $issuer);
    }

    protected function pushNotice(): array
    {
        return [EntryTypes::COUPONS, 'sent you a coupon'];
    }

    /** @param  array<string, mixed>  $validated */
    protected function issueOne(array $validated, User $issuer, int $recipientId): Coupon
    {
        $coupon = new Coupon([
            'recipient_id' => $recipientId,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'quantity' => $validated['quantity'],
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        $coupon->issuer_id = $issuer->id;
        $coupon->status = Coupon::STATUS_ISSUED;
        $coupon->redeemed_count = 0;
        $coupon->issued_at = now();
        $coupon->save();

        $coupon->code = sprintf('GC/%d/%06d', $coupon->issued_at->year, $coupon->id);
        $coupon->save();

        return $coupon;
    }
}
