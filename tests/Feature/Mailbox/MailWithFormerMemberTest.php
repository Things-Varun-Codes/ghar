<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SeedsPair;
use Tests\TestCase;

/** Alice has left the household; Bob keeps what passed between them. */
class MailWithFormerMemberTest extends TestCase
{
    use RefreshDatabase;
    use SeedsPair;

    public function test_their_note_stays_and_names_them_as_deleted(): void
    {
        [$alice, $bob] = $this->seedPair();
        MailboxMessage::factory()->to($bob)->create(['sender_id' => $alice->id]);
        $alice->forceFill(['removed_at' => now()])->save();

        $this->actingAs($bob)->get('/apps/our-exchange/messages')->assertOk()
            ->assertInertia(fn ($page) => $page->where('messages.data.0.sender.name', 'Alice (deleted)'));
    }

    public function test_a_coupon_from_them_can_no_longer_be_requested(): void
    {
        Notification::fake();
        [$alice, $bob] = $this->seedPair();
        $coupon = Coupon::factory()->create(['issuer_id' => $alice->id, 'recipient_id' => $bob->id, 'expires_at' => null]);
        $alice->forceFill(['removed_at' => now()])->save();

        $this->actingAs($bob)->patch("/apps/our-exchange/coupons/{$coupon->id}/request")->assertForbidden();
        $this->assertSame(Coupon::STATUS_ISSUED, $coupon->refresh()->status);
    }

    public function test_a_request_from_them_can_no_longer_be_fulfilled(): void
    {
        Notification::fake();
        [$alice, $bob] = $this->seedPair();
        $coupon = Coupon::factory()->requested()->create(['issuer_id' => $bob->id, 'recipient_id' => $alice->id]);
        $alice->forceFill(['removed_at' => now()])->save();

        $this->actingAs($bob)->patch("/apps/our-exchange/coupons/{$coupon->id}/fulfill")->assertForbidden();
    }

    public function test_a_citation_from_them_can_no_longer_be_paid(): void
    {
        Notification::fake();
        [$alice, $bob] = $this->seedPair();
        $citation = Citation::factory()->create(['issuer_id' => $alice->id, 'recipient_id' => $bob->id]);
        $alice->forceFill(['removed_at' => now()])->save();

        $this->actingAs($bob)->patch("/apps/our-exchange/citations/{$citation->id}/pay")->assertForbidden();
        $this->assertSame(Citation::STATUS_ISSUED, $citation->refresh()->status);
    }
}
