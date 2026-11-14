<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MailboxLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_renders_mailbox_summary_shape(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        User::factory()->create();

        $response = $this->actingAs($user)->get('/apps/our-mailbox');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->has('mailboxSummary.counts.messages')
                ->has('mailboxSummary.counts.challans')
                ->has('mailboxSummary.counts.flowers')
                ->where('mailboxSummary.unread_messages', 0)
                ->where('mailboxSummary.challans_action_needed', 0)
                ->where('mailboxSummary.latest_unread_preview', null)
                ->where('mailboxSummary.unread_flowers', 0)
                ->where('mailboxSummary.counts.flowers', 0),
        );
    }

    public function test_unread_badge(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        MailboxMessage::factory()->count(3)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $response = $this->actingAs($recipient)->get('/apps/our-mailbox');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->where('mailboxSummary.unread_messages', 3)
                ->where('mailboxSummary.counts.messages', 3)
                ->where('mailboxSummary.counts.flowers', 0)
                ->where('mailboxSummary.unread_flowers', 0)
                ->has('mailboxSummary.latest_unread_preview'),
        );
    }

    public function test_flowers_counts_are_independent_of_message_counts(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        MailboxMessage::factory()->count(2)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);
        MailboxMessage::factory()->count(4)->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        Bouquet::factory()->count(5)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);
        Bouquet::factory()->count(2)->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $response = $this->actingAs($recipient)->get('/apps/our-mailbox');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->where('mailboxSummary.counts.flowers', 7)
                ->where('mailboxSummary.unread_flowers', 5)
                ->where('mailboxSummary.counts.messages', 6)
                ->where('mailboxSummary.unread_messages', 2),
        );
    }

    public function test_landing_summary_includes_challans_count_and_action_needed(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        // Two received by the user (count these); one issued by the user  (must NOT count —
        // challans count is received-only).
        Challan::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, issued → action needed
        Challan::factory()->paid()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, paid → settled
        Challan::factory()->create(['issuer_id' => $user->id, 'recipient_id' => $partner->id]); // issued by user → not received, must NOT count  One not involving the user at all → must
        // NOT count.
        $stranger = User::factory()->create();
        Challan::factory()->create(['issuer_id' => $stranger->id, 'recipient_id' => $partner->id]);

        $this->actingAs($user)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->where('mailboxSummary.counts.challans', 2)
                ->where('mailboxSummary.challans_action_needed', 1)
                // The sibling messages count remains present.
                ->has('mailboxSummary.counts.messages')
            );
    }

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
