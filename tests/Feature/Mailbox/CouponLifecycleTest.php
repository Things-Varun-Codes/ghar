<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CouponLifecycleTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: User} */
    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_issue_creates_one_issued_row_with_unique_code_and_partner_recipient(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $response = $this->actingAs($issuer)->post('/apps/our-mailbox/coupons', [
            'recipient_ids' => [$recipient->id],
            'title' => 'Back massage',
            'quantity' => 2,
        ]);

        $coupon = Coupon::firstOrFail();
        $response->assertRedirect("/apps/our-mailbox/coupons/{$coupon->id}");
        $this->assertSuccessToast($response, 'Coupon sent.');

        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->status);
        $this->assertSame($issuer->id, $coupon->issuer_id);
        $this->assertSame($recipient->id, $coupon->recipient_id);
        $this->assertMatchesRegularExpression('#^GC/\d{4}/\d{6}$#', $coupon->code);
        $this->assertSame('Back massage', $coupon->title);
        $this->assertSame(2, $coupon->quantity);
        $this->assertSame(0, $coupon->redeemed_count);
    }

    public function test_recipient_can_request_an_issued_coupon(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        $response = $this->actingAs($recipient)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/request")
            ->assertRedirect();
        $this->assertSuccessToast($response, 'Coupon requested.');

        $coupon->refresh();
        $this->assertSame(Coupon::STATUS_REQUESTED, $coupon->status);
        $this->assertNotNull($coupon->requested_at);
        $this->assertSame(0, $coupon->redeemed_count);
    }

    public function test_fulfilling_the_only_unit_depletes_the_coupon(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 1,
            'expires_at' => null,
        ]);

        $response = $this->actingAs($issuer)
            ->patch("/apps/our-mailbox/coupons/{$coupon->id}/fulfill")
            ->assertRedirect();
        $this->assertSuccessToast($response, 'Coupon fulfilled.');

        $coupon->refresh();
        $this->assertSame(Coupon::STATUS_DEPLETED, $coupon->status);
        $this->assertSame(1, $coupon->redeemed_count);
        $this->assertSame(0, $coupon->remaining());
        $this->assertNull($coupon->requested_at);
        $this->assertNotNull($coupon->last_fulfilled_at);
    }

    public function test_quantity_two_cycles_issued_then_depletes_on_second_fulfil(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        // First redemption: request → fulfill → back to issued, remaining 1.
        $this->actingAs($recipient)->patch("/apps/our-mailbox/coupons/{$coupon->id}/request");
        $this->actingAs($issuer)->patch("/apps/our-mailbox/coupons/{$coupon->id}/fulfill");

        $coupon->refresh();
        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->status);
        $this->assertSame(1, $coupon->redeemed_count);
        $this->assertSame(1, $coupon->remaining());

        // Second redemption: request → fulfill the last unit → depleted.
        $this->actingAs($recipient)->patch("/apps/our-mailbox/coupons/{$coupon->id}/request");
        $this->actingAs($issuer)->patch("/apps/our-mailbox/coupons/{$coupon->id}/fulfill");

        $coupon->refresh();
        $this->assertSame(Coupon::STATUS_DEPLETED, $coupon->status);
        $this->assertSame(2, $coupon->redeemed_count);
        $this->assertSame(0, $coupon->remaining());
    }

    public function test_issuing_to_several_people_creates_one_coupon_each_and_pushes_to_each(): void
    {
        Notification::fake();
        [$issuer, $first] = $this->seedPair();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $response = $this->actingAs($issuer)->post('/apps/our-mailbox/coupons', [
            'recipient_ids' => [$first->id, $second->id],
            'title' => 'Movie pick',
            'quantity' => 1,
        ]);

        $response->assertRedirect('/apps/our-mailbox/coupons?tab=issued');
        $this->assertSuccessToast($response, '2 coupons sent.');

        $this->assertSame(
            [$first->id, $second->id],
            Coupon::query()->orderBy('id')->pluck('recipient_id')->all(),
        );
        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);
        Notification::assertNotSentTo($issuer, GenericPushNotification::class);
    }

    public function test_issuing_to_yourself_is_refused(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-mailbox/coupons')
            ->post('/apps/our-mailbox/coupons', [
                'recipient_ids' => [$issuer->id],
                'title' => 'Movie pick',
                'quantity' => 1,
            ])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_coupons', 0);
    }
}
