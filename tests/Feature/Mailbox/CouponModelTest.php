<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_persists_across_all_states(): void
    {
        Coupon::factory()->create();
        Coupon::factory()->requested()->create();
        Coupon::factory()->depleted()->create();

        $this->assertSame(3, Coupon::count());

        $requested = Coupon::where('status', Coupon::STATUS_REQUESTED)->firstOrFail();
        $this->assertNotNull($requested->requested_at);

        $depleted = Coupon::where('status', Coupon::STATUS_DEPLETED)->firstOrFail();
        $this->assertSame(0, $depleted->remaining());
    }

    public function test_remaining_derives_from_quantity_minus_redeemed(): void
    {
        $coupon = Coupon::factory()->create(['quantity' => 5, 'redeemed_count' => 2]);
        $this->assertSame(3, $coupon->remaining());
    }

    public function test_visibility_scope_is_issuer_or_recipient_only(): void
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $this->assertTrue(Coupon::query()->visibleTo($issuer)->whereKey($coupon->id)->exists());
        $this->assertTrue(Coupon::query()->visibleTo($recipient)->whereKey($coupon->id)->exists());
        $this->assertFalse(Coupon::query()->visibleTo($bystander)->whereKey($coupon->id)->exists());
    }

    public function test_is_expired_is_whole_day(): void
    {
        $expired = Coupon::factory()->create(['expires_at' => now()->subDay()]);
        $this->assertTrue($expired->isExpired());

        $today = Coupon::factory()->create(['expires_at' => now()]);
        $this->assertFalse($today->isExpired(), 'a coupon valid until today is still redeemable');

        $noExpiry = Coupon::factory()->create(['expires_at' => null]);
        $this->assertFalse($noExpiry->isExpired());
    }

    public function test_code_status_issuer_and_redeemed_count_are_not_mass_assignable(): void
    {
        $attacker = User::factory()->create();
        $recipient = User::factory()->create();

        $coupon = new Coupon;

        try {
            $coupon->fill([
                'recipient_id' => $recipient->id,
                'title' => 'Back massage',
                'quantity' => 2,
                // Attempted tampering — all four must be rejected.
                'code' => 'GC/1999/000001',
                'status' => Coupon::STATUS_DEPLETED,
                'issuer_id' => $attacker->id,
                'redeemed_count' => 99,
            ]);
            $this->fail('Expected MassAssignmentException for the guarded fields.');
        } catch (MassAssignmentException $e) {
            $this->assertStringContainsString('code', $e->getMessage());
            $this->assertStringContainsString('status', $e->getMessage());
            $this->assertStringContainsString('issuer_id', $e->getMessage());
            $this->assertStringContainsString('redeemed_count', $e->getMessage());
        }

        $this->assertNull($coupon->code);
        $this->assertNotSame(Coupon::STATUS_DEPLETED, $coupon->status);
        $this->assertNull($coupon->issuer_id);
        $this->assertNull($coupon->redeemed_count);
        $this->assertSame($recipient->id, $coupon->recipient_id);
    }
}
