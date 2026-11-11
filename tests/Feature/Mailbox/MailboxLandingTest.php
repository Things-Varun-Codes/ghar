<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->where('mailboxSummary.counts.messages', 2)
                ->where('mailboxSummary.unread_messages', 2),
        );
    }
}
