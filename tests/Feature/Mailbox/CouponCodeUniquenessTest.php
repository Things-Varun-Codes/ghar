<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CouponCodeUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_issues_yield_distinct_well_formed_codes(): void
    {
        Notification::fake();

        $issuer = User::factory()->create();
        $recipient = User::factory()->create();

        for ($i = 0; $i < 8; $i++) {
            $this->actingAs($issuer)->post('/apps/our-mailbox/coupons', [
                'recipient_ids' => [$recipient->id],
                'title' => 'Back massage',
                'quantity' => 1,
            ]);
        }

        $codes = Coupon::query()->pluck('code')->all();

        $this->assertCount(8, $codes);
        $this->assertSame(8, count(array_unique($codes)), 'codes must all be distinct');
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression('#^GC/\d{4}/\d{6}$#', $code);
        }
    }

    public function test_unique_index_rejects_a_duplicate_code(): void
    {
        Coupon::factory()->create(['code' => 'GC/2026/000042']);

        $this->expectException(QueryException::class);

        Coupon::factory()->create(['code' => 'GC/2026/000042']);
    }
}
