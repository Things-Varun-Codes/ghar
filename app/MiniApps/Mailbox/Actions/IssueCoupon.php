<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueCouponRequest;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class IssueCoupon
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    /** @return Collection<int, Coupon> */
    public function __invoke(IssueCouponRequest $request, User $issuer): Collection
    {
        $validated = $request->validated();
        $recipientIds = $request->recipientIds();

        /** @var Collection<int, Coupon> $coupons */
        $coupons = DB::transaction(fn (): Collection => collect($recipientIds)->map(
            fn (int $recipientId): Coupon => $this->issueOne($validated, $issuer, $recipientId),
        ));

        $firstName = $issuer->firstName();

        foreach ($coupons as $coupon) {
            $this->push->toEntry(
                [$coupon->loadMissing('recipient')->recipient],
                EntryTypes::COUPONS,
                $coupon->id,
                "{$firstName} sent you a coupon",
            );
        }

        return $coupons;
    }

    /** @param  array<string, mixed>  $validated */
    private function issueOne(array $validated, User $issuer, int $recipientId): Coupon
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
