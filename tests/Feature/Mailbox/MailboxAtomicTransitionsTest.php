<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Actions\CancelRequest;
use App\MiniApps\Mailbox\Actions\FulfillCoupon;
use App\MiniApps\Mailbox\Actions\PayChallan;
use App\MiniApps\Mailbox\Actions\RequestCoupon;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class MailboxAtomicTransitionsTest extends TestCase
{
    use RefreshDatabase;

    private User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->actor = User::factory()->create();
    }

    private function assertStaleReplayRejected(callable $action, Model $first, Model $stale): void
    {
        DB::enableQueryLog();
        $action($first, $this->actor);
        $this->assertTrue(
            collect(DB::getQueryLog())->contains(fn (array $q): bool => str_contains($q['query'], 'for update')),
            'The row must be read with lockForUpdate().',
        );

        try {
            $action($stale, $this->actor);
            $this->fail('A stale replay must abort.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }
    }

    public function test_fulfill_cannot_spend_two_units(): void
    {
        $coupon = Coupon::factory()->requested()->create(['quantity' => 3, 'expires_at' => null]);
        $stale = Coupon::findOrFail($coupon->id);

        $this->assertStaleReplayRejected(app(FulfillCoupon::class), $coupon, $stale);

        $this->assertSame(1, $coupon->fresh()->redeemed_count);
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_fulfill_returns_the_updated_coupon(): void
    {
        $coupon = Coupon::factory()->requested()->create(['quantity' => 1, 'expires_at' => null]);

        $result = app(FulfillCoupon::class)($coupon, $this->actor);

        $this->assertSame(Coupon::STATUS_DEPLETED, $result->status);
        $this->assertSame(1, $result->redeemed_count);
    }

    public function test_request_cannot_push_twice(): void
    {
        $coupon = Coupon::factory()->create(['expires_at' => null]);
        $stale = Coupon::findOrFail($coupon->id);

        $this->assertStaleReplayRejected(app(RequestCoupon::class), $coupon, $stale);

        $this->assertSame(Coupon::STATUS_REQUESTED, $coupon->fresh()->status);
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }

    public function test_cancel_rechecks_the_locked_row(): void
    {
        $coupon = Coupon::factory()->requested()->create(['expires_at' => null]);
        $stale = Coupon::findOrFail($coupon->id);

        $this->assertStaleReplayRejected(app(CancelRequest::class), $coupon, $stale);

        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->fresh()->status);
    }

    public function test_pay_cannot_push_twice(): void
    {
        $challan = Challan::factory()->create();
        $stale = Challan::findOrFail($challan->id);

        $this->assertStaleReplayRejected(app(PayChallan::class), $challan, $stale);

        $this->assertSame(Challan::STATUS_PAID, $challan->fresh()->status);
        Notification::assertSentTimes(GenericPushNotification::class, 1);
    }
}
