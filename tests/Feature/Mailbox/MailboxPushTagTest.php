<?php

namespace Tests\Feature\Mailbox;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MailboxPushTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_push_uses_correct_tag(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-mailbox/messages', [
            'recipient_ids' => [$recipient->id],
            'body' => 'tag contract test',
        ])->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $array = $webPushMessage->toArray();

                return ($array['tag'] ?? null) === 'our-mailbox:messages';
            }
        );
    }
}
