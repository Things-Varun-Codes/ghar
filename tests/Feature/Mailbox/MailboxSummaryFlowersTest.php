<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Support\MailboxSummary;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailboxSummaryFlowersTest extends TestCase
{
    use RefreshDatabase;

    public function test_flowers_counts_are_independent_of_message_counts(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        // N messages, 2 of them unread.
        MailboxMessage::factory()->count(4)->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);
        MailboxMessage::factory()->count(2)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        // M bouquets, 3 of them unread.
        Bouquet::factory()->count(5)->to($recipient, read: true)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);
        Bouquet::factory()->count(3)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $summary = MailboxSummary::forUser($recipient);

        $this->assertSame(8, $summary['counts']['flowers']);
        $this->assertSame(3, $summary['unread_flowers']);

        // Fold-in prevention: messages counts must reflect only the 6  MailboxMessage rows,
        // not the 8 Bouquet rows.
        $this->assertSame(6, $summary['counts']['messages']);
        $this->assertSame(2, $summary['unread_messages']);
    }

    public function test_flowers_counts_are_zero_when_no_bouquets_exist(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        MailboxMessage::factory()->count(2)->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $summary = MailboxSummary::forUser($recipient);

        $this->assertSame(0, $summary['counts']['flowers']);
        $this->assertSame(0, $summary['unread_flowers']);
        $this->assertSame(2, $summary['counts']['messages']);
        $this->assertSame(2, $summary['unread_messages']);
    }
}
