<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CouponAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: User} */
    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_issue_rejects_missing_title(): void
    {
        Notification::fake();
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', [
                'quantity' => 2,
            ])
            ->assertSessionHasErrors('title');

        $this->assertDatabaseCount('mailbox_coupons', 0);
    }

    public function test_issue_rejects_over_length_title(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', [
                'title' => str_repeat('a', 81),
                'quantity' => 1,
            ])
            ->assertSessionHasErrors('title');

        $this->assertDatabaseCount('mailbox_coupons', 0);
    }

    public function test_issue_rejects_out_of_range_quantity(): void
    {
        [$issuer] = $this->seedPair();

        // Zero and over-cap both rejected.
        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', ['title' => 'Back rub', 'quantity' => 0])
            ->assertSessionHasErrors('quantity');

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', ['title' => 'Back rub', 'quantity' => 21])
            ->assertSessionHasErrors('quantity');

        $this->assertDatabaseCount('mailbox_coupons', 0);
    }

    public function test_issue_rejects_past_expiry(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', [
                'title' => 'Back rub',
                'quantity' => 1,
                'expires_at' => now()->subDay()->toDateString(),
            ])
            ->assertSessionHasErrors('expires_at');

        $this->assertDatabaseCount('mailbox_coupons', 0);
    }

    public function test_code_status_issuer_redeemed_count_injection_is_ignored(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $this->actingAs($issuer)->post('/apps/our-mailbox/coupons', [
            'recipient_ids' => [$recipient->id],
            'title' => 'Back massage',
            'quantity' => 2,
            // Injection attempts — all must be ignored (server sets them).
            'code' => 'GC/1999/000001',
            'status' => Coupon::STATUS_DEPLETED,
            'issuer_id' => $recipient->id,
            'redeemed_count' => 99,
        ]);

        $coupon = Coupon::firstOrFail();
        $this->assertNotSame('GC/1999/000001', $coupon->code);
        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->status);
        $this->assertSame($issuer->id, $coupon->issuer_id);
        $this->assertSame(0, $coupon->redeemed_count);
    }

    public function test_non_recipient_cannot_request(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        // The issuer is not the recipient → cannot request their own coupon.
        $this->actingAs($issuer)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/request")
            ->assertForbidden();

        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->fresh()->status);
    }

    public function test_cannot_request_while_already_requested(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        // Quantity 2 so units remain, but a request is already pending.
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/request")
            ->assertForbidden();

        $this->assertSame(Coupon::STATUS_REQUESTED, $coupon->fresh()->status);
    }

    public function test_cannot_request_an_expired_coupon(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/request")
            ->assertForbidden();

        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->fresh()->status);
    }

    public function test_cannot_request_a_depleted_coupon(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->depleted()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/request")
            ->assertForbidden();

        $this->assertSame(Coupon::STATUS_DEPLETED, $coupon->fresh()->status);
    }

    public function test_recipient_can_cancel_their_pending_request(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        $response = $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/cancel")
            ->assertRedirect();
        $this->assertSuccessToast($response, 'Request cancelled.');

        $coupon->refresh();
        // Returns to issued with NO unit consumed.
        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->status);
        $this->assertNull($coupon->requested_at);
        $this->assertSame(0, $coupon->redeemed_count);
    }

    public function test_non_issuer_cannot_fulfill(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        // The recipient cannot fulfill their own request.
        $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/fulfill")
            ->assertForbidden();

        $this->assertSame(Coupon::STATUS_REQUESTED, $coupon->fresh()->status);
    }

    public function test_issuer_can_withdraw_an_issued_coupon(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        $response = $this->actingAs($issuer)
            ->delete("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertRedirect('/apps/our-mailbox/coupons');
        $this->assertSuccessToast($response, 'Coupon withdrawn.');

        // Hard delete — gone for both parties.
        $this->assertDatabaseMissing('mailbox_coupons', ['id' => $coupon->id]);
    }

    public function test_issuer_cannot_withdraw_a_coupon_with_a_pending_request(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        // Withdraw is issued-only — a pending request must be fulfilled/cancelled first.
        $this->actingAs($issuer)
            ->delete("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_coupons', ['id' => $coupon->id]);
    }

    public function test_recipient_cannot_withdraw_a_coupon(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        $this->actingAs($recipient)
            ->delete("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('mailbox_coupons', ['id' => $coupon->id]);
    }

    public function test_available_actions_are_viewer_contextual(): void
    {
        [$issuer, $recipient] = $this->seedPair();
        $issued = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);

        // Recipient of an issued row → [request].
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/coupons/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', ['request'])
            );

        // Issuer of the same issued row → [delete] (withdraw).
        $this->actingAs($issuer)
            ->get("/apps/our-mailbox/coupons/{$issued->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', ['delete'])
            );

        // A requested row → recipient sees [cancel], issuer sees [fulfill].
        $requested = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/coupons/{$requested->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', ['cancel'])
            );
        $this->actingAs($issuer)
            ->get("/apps/our-mailbox/coupons/{$requested->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', ['fulfill'])
            );

        // A depleted row → [] for everyone (terminal).
        $depleted = Coupon::factory()->depleted()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);
        $this->actingAs($recipient)
            ->get("/apps/our-mailbox/coupons/{$depleted->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('coupon.available_actions', [])
            );
    }
}
