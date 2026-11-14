<?php

namespace Tests\Feature\Mailbox;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use Tests\TestCase;

class MailboxNotifyChannelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_channels_array_is_push_only(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-mailbox/messages', [
            'recipient_ids' => [$recipient->id],
            'body' => 'push-only contract',
        ])->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification, array $channels) {
                // via() should resolve to [WebPushChannel::class] — NOT ['mail'].
                return $channels === [WebPushChannel::class];
            }
        );
    }

    public function test_unsubscribed_recipient_receives_no_error(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $response = $this->actingAs($sender)->post('/apps/our-mailbox/messages', [
            'recipient_ids' => [$recipient->id],
            'body' => 'no subscriptions on the recipient',
        ]);

        $response->assertRedirect('/apps/our-mailbox/messages');
        $this->assertDatabaseHas('mailbox_messages', [
            'sender_id' => $sender->id,
            'body' => 'no subscriptions on the recipient',
        ]);
        $this->assertDatabaseHas('mailbox_message_recipients', ['user_id' => $recipient->id]);
    }
}
