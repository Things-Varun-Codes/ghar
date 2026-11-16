<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MailboxLandingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
    }

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
                ->has('mailboxPeeks.notes'),
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

    public function test_peeks_show_the_latest_received_note_and_bouquet(): void
    {
        $sender = User::factory()->create(['name' => 'Ravi']);
        $recipient = User::factory()->create();

        MailboxMessage::factory()->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'body' => 'older note',
            'posted_at' => now()->subDay(),
        ]);
        MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'body' => 'newest note',
            'posted_at' => now(),
        ]);
        // Sent by the viewer: not a received note, so never the peek.
        MailboxMessage::factory()->to($sender)->create([
            'sender_id' => $recipient->id,
            'body' => 'my own note',
            'posted_at' => now()->addMinute(),
        ]);
        Bouquet::factory()->to($recipient)->create(['sender_id' => $sender->id, 'posted_at' => now()]);

        $this->actingAs($recipient)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.notes.body', 'newest note')
                ->where('mailboxPeeks.notes.from', 'Ravi')
                ->where('mailboxPeeks.flowers.from', 'Ravi')
                ->has('mailboxPeeks.flowers.image_url')
            );

        // Reading the landing must not mark the note read.
        $this->assertSame(1, MailboxMessage::query()->unreadBy($recipient)->count());
    }

    public function test_challan_and_coupon_peeks_prefer_what_waits_on_the_viewer(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        Challan::factory()->paid()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $user->id,
            'offence' => 'Settled one',
            'issued_at' => now(),
        ]);
        Challan::factory()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $user->id,
            'offence' => 'Unpaid one',
            'issued_at' => now()->subWeek(),
        ]);

        Coupon::factory()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $user->id,
            'title' => 'Received coupon',
            'expires_at' => null,
            'issued_at' => now(),
        ]);
        Coupon::factory()->requested()->create([
            'issuer_id' => $user->id,
            'recipient_id' => $partner->id,
            'title' => 'Asked of me',
            'expires_at' => null,
            'issued_at' => now()->subWeek(),
        ]);

        $this->actingAs($user)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.challans.offence', 'Unpaid one')
                ->where('mailboxPeeks.challans.status', Challan::STATUS_ISSUED)
                ->missing('mailboxPeeks.challans.penalty')
                ->missing('mailboxPeeks.challans.remarks')
                ->where('mailboxPeeks.coupons.title', 'Asked of me')
                ->where('mailboxPeeks.coupons.status', Coupon::STATUS_REQUESTED)
            );
    }

    public function test_a_non_recipient_sees_no_one_elses_mail_in_the_peeks(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        MailboxMessage::factory()->to($recipient)->create(['sender_id' => $sender->id, 'body' => 'private']);
        Bouquet::factory()->to($recipient)->create(['sender_id' => $sender->id]);
        Challan::factory()->create(['issuer_id' => $sender->id, 'recipient_id' => $recipient->id]);
        Coupon::factory()->create(['issuer_id' => $sender->id, 'recipient_id' => $recipient->id, 'expires_at' => null]);

        $this->actingAs($bystander)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.notes', null)
                ->where('mailboxPeeks.flowers', null)
                ->where('mailboxPeeks.challans', null)
                ->where('mailboxPeeks.coupons', null)
            );
    }
}
