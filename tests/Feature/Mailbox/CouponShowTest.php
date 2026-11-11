<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CouponShowTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: User, 2: Coupon} */
    private function seedCoupon(): array
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        return [$issuer, $recipient, $coupon];
    }

    public function test_recipient_can_view_with_request_action(): void
    {
        [, $recipient, $coupon] = $this->seedCoupon();

        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Coupons/Show')
                ->where('coupon.code', $coupon->code)
                ->where('coupon.status', Coupon::STATUS_ISSUED)
                ->where('coupon.remaining', 2)
                ->where('coupon.available_actions', ['request'])
            );
    }

    public function test_issuer_can_view_with_withdraw_action_on_issued_row(): void
    {
        [$issuer, , $coupon] = $this->seedCoupon();

        $this->actingAs($issuer)
            ->get("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', ['delete'])
            );
    }

    public function test_third_party_is_forbidden(): void
    {
        [, , $coupon] = $this->seedCoupon();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)
            ->get("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertForbidden();
    }

    public function test_expired_coupon_is_flagged_and_offers_no_action(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        // Issued at rest, but past its valid-until date.
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'status' => Coupon::STATUS_ISSUED,
            'expires_at' => now()->subDay(),
        ]);

        // The recipient sees the coupon flagged expired AND gets no request  action — so the
        // UI can show "Expired" instead of a silent, actionless  "Ready" card.
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.is_expired', true)
                ->where('coupon.status', Coupon::STATUS_ISSUED)
                ->where('coupon.available_actions', [])
            );
    }
}
