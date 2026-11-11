<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CouponVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_bystander_sees_neither_side(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        foreach (['received', 'issued'] as $tab) {
            $this->actingAs($bystander)
                ->get('/apps/our-mailbox/coupons?tab='.$tab)
                ->assertInertia(fn (Assert $page) => $page->has('coupons.data', 0));
        }

        $this->actingAs($recipient)
            ->get('/apps/our-mailbox/coupons')
            ->assertInertia(fn (Assert $page) => $page->has('coupons.data', 1));
    }

    public function test_index_returns_received_and_issued_split(): void
    {
        $primary = User::factory()->create();
        $partner = User::factory()->create();

        $primaryIssued = Coupon::factory()->create(['issuer_id' => $primary->id, 'recipient_id' => $partner->id, 'expires_at' => null]);
        $primaryReceived = Coupon::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $primary->id, 'expires_at' => null]);

        // Received tab (default): the coupon the partner issued TO primary.
        $this->actingAs($primary)
            ->get('/apps/our-mailbox/coupons')
            ->assertInertia(fn (Assert $page) => $page
                ->where('tab', 'received')
                ->has('coupons.data', 1)
                ->where('coupons.data.0.id', $primaryReceived->id)
            );

        // Issued tab: the coupon primary issued to the partner.
        $this->actingAs($primary)
            ->get('/apps/our-mailbox/coupons?tab=issued')
            ->assertInertia(fn (Assert $page) => $page
                ->where('tab', 'issued')
                ->has('coupons.data', 1)
                ->where('coupons.data.0.id', $primaryIssued->id)
            );
    }
}
