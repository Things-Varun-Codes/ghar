<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MailboxLandingCouponTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_summary_includes_coupons_count_and_action_needed(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        // Two received by the user (count these).
        Coupon::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id, 'expires_at' => null]);
        Coupon::factory()->depleted()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id, 'expires_at' => null]);

        // Issued by the user (NOT counted in coupons — received-only), one of  which has a
        // pending request → the user must fulfil it (action needed).
        Coupon::factory()->requested()->create(['issuer_id' => $user->id, 'recipient_id' => $partner->id, 'expires_at' => null]);
        Coupon::factory()->create(['issuer_id' => $user->id, 'recipient_id' => $partner->id, 'expires_at' => null]);

        // Not involving the user at all → must NOT count.
        $stranger = User::factory()->create();
        Coupon::factory()->create(['issuer_id' => $stranger->id, 'recipient_id' => $partner->id, 'expires_at' => null]);

        $this->actingAs($user)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->where('mailboxSummary.counts.coupons', 2)
                ->where('mailboxSummary.coupons_action_needed', 1)
                // The sibling counts remain present.
                ->has('mailboxSummary.counts.challans')
                ->has('mailboxSummary.counts.messages')
            );
    }
}
