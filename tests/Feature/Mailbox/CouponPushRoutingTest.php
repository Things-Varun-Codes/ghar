<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CouponPushRoutingTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: User} */
    private function seedPair(): array
    {
        $issuer = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        return [$issuer, $recipient];
    }

    public function test_request_pushes_generic_body_to_issuer_only(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'title' => 'Secret leak title',
            'expires_at' => null,
        ]);

        $this->actingAs($recipient)->patch("/apps/our-mailbox/coupons/{$coupon->id}/request");

        Notification::assertSentTo(
            $issuer,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($issuer) {
                $arr = $notification->toWebPush($issuer, $notification)->toArray();

                return ($arr['tag'] ?? null) === 'our-mailbox:coupons'
                    && str_contains($arr['body'] ?? '', 'Bob')
                    && str_contains($arr['body'] ?? '', 'coupon')
                    // No title leak.
                    && ! str_contains($arr['body'] ?? '', 'Secret leak title');
            }
        );
        Notification::assertNotSentTo($recipient, GenericPushNotification::class);
    }

    public function test_fulfill_pushes_generic_body_to_recipient_only(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'title' => 'Secret leak title',
            'expires_at' => null,
        ]);

        $this->actingAs($issuer)->patch("/apps/our-mailbox/coupons/{$coupon->id}/fulfill");

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $arr = $notification->toWebPush($recipient, $notification)->toArray();

                return ($arr['tag'] ?? null) === 'our-mailbox:coupons'
                    && str_contains($arr['body'] ?? '', 'Alice')
                    && ! str_contains($arr['body'] ?? '', 'Secret leak title');
            }
        );
        Notification::assertNotSentTo($issuer, GenericPushNotification::class);
    }

    public function test_cancel_and_withdraw_fire_no_push(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $requested = Coupon::factory()->requested()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);
        $this->actingAs($recipient)->patch("/apps/our-mailbox/coupons/{$requested->id}/cancel");

        $issued = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'expires_at' => null,
        ]);
        $this->actingAs($issuer)->delete("/apps/our-mailbox/coupons/{$issued->id}");

        Notification::assertNothingSent();
    }
}
