<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;

/**
 * `available_actions` is the only source of action legality the client uses.
 */
class CouponResource
{
    /** @return array<string, mixed> */
    public function __invoke(Coupon $coupon): array
    {
        /** @var User|null $viewer */
        $viewer = auth()->user();

        return [
            'id' => $coupon->id,
            'code' => $coupon->code,
            'status' => $coupon->status,
            'title' => $coupon->title,
            'description' => $coupon->description,
            'quantity' => $coupon->quantity,
            'redeemed_count' => $coupon->redeemed_count,
            'remaining' => $coupon->remaining(),
            'expires_at' => $coupon->expires_at?->toDateString(),
            'is_expired' => $coupon->isExpired(),
            'has_pending_request' => $coupon->hasPendingRequest(),
            'requested_at' => $coupon->requested_at?->toIso8601String(),
            'issued_at' => $coupon->issued_at->toIso8601String(),
            'issued_at_human' => $coupon->issued_at->diffForHumans(),
            'last_fulfilled_at' => $coupon->last_fulfilled_at?->toIso8601String(),
            'is_mine' => $viewer !== null && $coupon->issuer_id === $viewer->id,
            'issuer' => [
                'id' => $coupon->issuer->id,
                'name' => $coupon->issuer->name,
            ],
            'recipient' => [
                'id' => $coupon->recipient->id,
                'name' => $coupon->recipient->name,
            ],
            'available_actions' => $this->availableActionsFor($coupon, $viewer),
        ];
    }

    /** @return list<string> */
    private function availableActionsFor(Coupon $coupon, ?User $viewer): array
    {
        if ($viewer === null) {
            return [];
        }

        return collect(['request', 'cancel', 'fulfill', 'delete'])
            ->filter(fn (string $ability) => $viewer->can($ability, $coupon))
            ->values()
            ->all();
    }
}
