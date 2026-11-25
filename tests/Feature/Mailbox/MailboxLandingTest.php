<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
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

        $response = $this->actingAs($user)->get('/apps/our-exchange');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->has('mailboxSummary.counts.messages')
                ->has('mailboxSummary.counts.citations')
                ->has('mailboxSummary.counts.postcards')
                ->where('mailboxSummary.unread_messages', 0)
                ->where('mailboxSummary.citations_action_needed', 0)
                ->where('mailboxSummary.unread_postcards', 0)
                ->where('mailboxSummary.counts.postcards', 0),
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

        $response = $this->actingAs($recipient)->get('/apps/our-exchange');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->where('mailboxSummary.unread_messages', 3)
                ->where('mailboxSummary.counts.messages', 3)
                ->where('mailboxSummary.counts.postcards', 0)
                ->where('mailboxSummary.unread_postcards', 0)
                ->has('mailboxPeeks.notes'),
        );
    }

    public function test_postcard_counts_are_independent_of_message_counts(): void
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

        Postcard::factory()->count(5)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);
        Postcard::factory()->count(2)->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $response = $this->actingAs($recipient)->get('/apps/our-exchange');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->where('mailboxSummary.counts.postcards', 7)
                ->where('mailboxSummary.unread_postcards', 5)
                ->where('mailboxSummary.counts.messages', 6)
                ->where('mailboxSummary.unread_messages', 2),
        );
    }

    public function test_landing_summary_includes_citations_count_and_action_needed(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        // Two received by the user (count these); one issued by the user  (must NOT count —
        // citations count is received-only).
        Citation::factory()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, issued → action needed
        Citation::factory()->paid()->create(['issuer_id' => $partner->id, 'recipient_id' => $user->id]); // received, paid → settled
        Citation::factory()->create(['issuer_id' => $user->id, 'recipient_id' => $partner->id]); // issued by user → not received, must NOT count  One not involving the user at all → must
        // NOT count.
        $stranger = User::factory()->create();
        Citation::factory()->create(['issuer_id' => $stranger->id, 'recipient_id' => $partner->id]);

        $this->actingAs($user)
            ->get('/apps/our-exchange')
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->where('mailboxSummary.counts.citations', 2)
                ->where('mailboxSummary.citations_action_needed', 1)
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
            ->get('/apps/our-exchange')
            ->assertInertia(fn (Assert $page) => $page
                ->component('MiniApps/Mailbox/Pages/Landing')
                ->where('mailboxSummary.counts.coupons', 2)
                ->where('mailboxSummary.coupons_action_needed', 1)
                // The sibling counts remain present.
                ->has('mailboxSummary.counts.citations')
                ->has('mailboxSummary.counts.messages')
            );
    }

    public function test_peeks_show_the_latest_received_note_and_postcard(): void
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
        Postcard::factory()->to($recipient)->create(['sender_id' => $sender->id, 'posted_at' => now()]);

        $this->actingAs($recipient)
            ->get('/apps/our-exchange')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.notes.body', 'newest note')
                ->where('mailboxPeeks.notes.from', 'Ravi')
                ->where('mailboxPeeks.postcards.from', 'Ravi')
                ->has('mailboxPeeks.postcards.image_url')
            );

        // Reading the landing must not mark the note read.
        $this->assertSame(1, MailboxMessage::query()->unreadBy($recipient)->count());
    }

    public function test_citation_and_coupon_peeks_prefer_what_waits_on_the_viewer(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        Citation::factory()->paid()->create([
            'issuer_id' => $partner->id,
            'recipient_id' => $user->id,
            'offence' => 'Settled one',
            'issued_at' => now(),
        ]);
        Citation::factory()->create([
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
            ->get('/apps/our-exchange')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.citations.offence', 'Unpaid one')
                ->where('mailboxPeeks.citations.status', Citation::STATUS_ISSUED)
                ->missing('mailboxPeeks.citations.penalty')
                ->missing('mailboxPeeks.citations.remarks')
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
        Postcard::factory()->to($recipient)->create(['sender_id' => $sender->id]);
        Citation::factory()->create(['issuer_id' => $sender->id, 'recipient_id' => $recipient->id]);
        Coupon::factory()->create(['issuer_id' => $sender->id, 'recipient_id' => $recipient->id, 'expires_at' => null]);

        $this->actingAs($bystander)
            ->get('/apps/our-exchange')
            ->assertInertia(fn (Assert $page) => $page
                ->where('mailboxPeeks.notes', null)
                ->where('mailboxPeeks.postcards', null)
                ->where('mailboxPeeks.citations', null)
                ->where('mailboxPeeks.coupons', null)
            );
    }
}
