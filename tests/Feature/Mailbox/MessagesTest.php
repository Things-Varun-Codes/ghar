<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_post_a_message(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create(['name' => 'Alice Smith']);
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $response = $this->actingAs($sender)->post('/apps/our-mailbox/messages', [
            'recipient_ids' => [$recipient->id],
            'body' => 'Hi from the test suite',
        ]);

        $response->assertRedirect('/apps/our-mailbox/messages');

        $message = MailboxMessage::firstOrFail();
        $this->assertSame($sender->id, $message->sender_id);
        $this->assertSame('Hi from the test suite', $message->body);
        $this->assertDatabaseHas('mailbox_message_recipients', [
            'message_id' => $message->id,
            'user_id' => $recipient->id,
            'read_at' => null,
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $messageArray = $webPushMessage->toArray();
                $body = $messageArray['body'] ?? '';

                return ($messageArray['tag'] ?? null) === 'our-mailbox:messages'
                    && str_contains($body, 'You got a note from')
                    && str_contains($body, 'Alice')
                    && ! str_contains($body, 'Hi from the test suite');
            }
        );

        // Actor (sender) is NOT notified — push only fans out to recipients.
        Notification::assertNotSentTo($sender, GenericPushNotification::class);
    }

    public function test_body_hard_cap_600_rejects(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();

        $response = $this->actingAs($sender)
            ->from('/apps/our-mailbox/messages')
            ->post('/apps/our-mailbox/messages', [
                'recipient_ids' => [User::factory()->create()->id],
                'body' => str_repeat('a', 700),
            ]);

        $response->assertSessionHasErrors('body');
        Notification::assertNothingSent();
        $this->assertDatabaseCount('mailbox_messages', 0);
    }

    public function test_body_required(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();
        User::factory()->create();

        $response = $this->actingAs($sender)
            ->from('/apps/our-mailbox/messages')
            ->post('/apps/our-mailbox/messages', [
                'body' => '',
            ]);

        $response->assertSessionHasErrors('body');
        Notification::assertNothingSent();
    }

    public function test_read_at_marked(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        /** @var MailboxMessage $message */
        $message = MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $this->assertNull($message->readAtFor($recipient));

        $this->actingAs($recipient)->get('/apps/our-mailbox/messages')->assertOk();

        $this->assertNotNull($message->readAtFor($recipient));
    }

    public function test_received_and_sent_tabs_return_correct_messages(): void
    {
        /** @var User $u1 */
        $u1 = User::factory()->create();
        /** @var User $u2 */
        $u2 = User::factory()->create();

        MailboxMessage::factory()->to($u2)->create([
            'sender_id' => $u1->id,
            'body' => 'note from u1 to u2',
            'posted_at' => now()->subMinute(),
        ]);
        MailboxMessage::factory()->to($u1)->create([
            'sender_id' => $u2->id,
            'body' => 'note from u2 to u1',
            'posted_at' => now(),
        ]);

        $received = $this->actingAs($u2)->get('/apps/our-mailbox/messages?tab=received');
        $received->assertOk();
        $received->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Mailbox/Pages/Messages')
                ->where('tab', 'received')
                ->has('messages.data', 1)
                ->where('messages.data.0.body', 'note from u1 to u2'),
        );

        $sent = $this->actingAs($u2)->get('/apps/our-mailbox/messages?tab=sent');
        $sent->assertOk();
        $sent->assertInertia(
            fn ($page) => $page
                ->where('tab', 'sent')
                ->has('messages.data', 1)
                ->where('messages.data.0.body', 'note from u2 to u1'),
        );
    }

    public function test_sending_to_yourself_is_refused(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        User::factory()->create();

        $this->actingAs($user)
            ->from('/apps/our-mailbox/messages')
            ->post('/apps/our-mailbox/messages', ['recipient_ids' => [$user->id], 'body' => 'note to self'])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_messages', 0);
        Notification::assertNothingSent();
    }

    public function test_recipients_are_required(): void
    {
        $sender = User::factory()->create();
        User::factory()->create();

        $this->actingAs($sender)
            ->from('/apps/our-mailbox/messages')
            ->post('/apps/our-mailbox/messages', ['body' => 'to nobody'])
            ->assertSessionHasErrors('recipient_ids');

        $this->actingAs($sender)
            ->from('/apps/our-mailbox/messages')
            ->post('/apps/our-mailbox/messages', ['recipient_ids' => [999999], 'body' => 'to a ghost'])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_messages', 0);
    }

    public function test_a_note_to_several_people_pushes_only_to_them_with_separate_read_state(): void
    {
        Notification::fake();

        $sender = User::factory()->create(['name' => 'Asha']);
        $first = User::factory()->create();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $this->actingAs($sender)
            ->post('/apps/our-mailbox/messages', [
                'recipient_ids' => [$first->id, $second->id],
                'body' => 'Family dinner on Sunday',
            ])
            ->assertRedirect('/apps/our-mailbox/messages');

        $message = MailboxMessage::firstOrFail();

        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);
        Notification::assertNotSentTo($sender, GenericPushNotification::class);

        // Only the first recipient opens their Received tab.
        $this->actingAs($first)->get('/apps/our-mailbox/messages')->assertOk();

        $this->assertNotNull($message->readAtFor($first));
        $this->assertNull($message->readAtFor($second));

        $this->actingAs($second)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn ($page) => $page->where('mailboxSummary.unread_messages', 1));
    }

    public function test_nobody_outside_sender_and_recipients_sees_a_note(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $bystander = User::factory()->create();

        MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'body' => 'just for you',
        ]);

        foreach (['received', 'sent'] as $tab) {
            $this->actingAs($bystander)
                ->get('/apps/our-mailbox/messages?tab='.$tab)
                ->assertInertia(fn ($page) => $page->has('messages.data', 0));
        }

        $this->actingAs($bystander)
            ->get('/apps/our-mailbox')
            ->assertInertia(fn ($page) => $page
                ->where('mailboxSummary.counts.messages', 0)
                ->where('mailboxSummary.unread_messages', 0)
                ->where('mailboxSummary.latest_unread_preview', null));

        $this->actingAs($recipient)
            ->get('/apps/our-mailbox/messages?tab=received')
            ->assertInertia(fn ($page) => $page
                ->has('messages.data', 1)
                ->where('messages.data.0.recipients.0.id', $recipient->id));
    }

    public function test_composer_receives_the_other_household_members(): void
    {
        $me = User::factory()->create(['name' => 'Meera']);
        $other = User::factory()->create(['name' => 'Kabir']);

        $this->actingAs($me)
            ->get('/apps/our-mailbox/messages')
            ->assertInertia(fn ($page) => $page
                ->where('members', [['id' => $other->id, 'name' => 'Kabir']]));
    }

    public function test_notify_send_called_with_correct_url_focus_query(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        $this->actingAs($sender)->post('/apps/our-mailbox/messages', [
            'recipient_ids' => [$recipient->id],
            'body' => 'check focus param',
        ])->assertRedirect();

        $message = MailboxMessage::firstOrFail();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient, $message) {
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $messageArray = $webPushMessage->toArray();
                $url = $messageArray['data']['url'] ?? '';

                return $url === "/apps/our-mailbox/messages?focus={$message->id}";
            }
        );
    }

    public function test_messages_index_uses_cursor_keyset_both_tabs(): void
    {
        Notification::fake();

        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();
        MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
        ]);

        foreach (['received' => $recipient, 'sent' => $sender] as $tab => $viewer) {
            $this->actingAs($viewer)
                ->get('/apps/our-mailbox/messages?tab='.$tab)
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('MiniApps/Mailbox/Pages/Messages')
                    ->where('tab', $tab)
                    ->has('messages.data', 1)
                    // cursorPaginate() omits offset meta (a LengthAwarePaginator would expose
                    // these).
                    ->missing('messages.total')
                    ->missing('messages.last_page')
                    ->missing('messages.current_page'));
        }
    }

    public function test_sender_can_delete_their_own_message(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        /** @var MailboxMessage $message */
        $message = MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $response = $this->actingAs($sender)
            ->from('/apps/our-mailbox/messages')
            ->delete('/apps/our-mailbox/messages/'.$message->id);

        $response->assertRedirect('/apps/our-mailbox/messages');

        $this->assertDatabaseMissing('mailbox_messages', ['id' => $message->id]);
    }

    public function test_recipient_cannot_delete_a_message_they_received(): void
    {
        /** @var User $sender */
        $sender = User::factory()->create();
        /** @var User $recipient */
        $recipient = User::factory()->create();

        /** @var MailboxMessage $message */
        $message = MailboxMessage::factory()->to($recipient)->create([
            'sender_id' => $sender->id,
            'posted_at' => now(),
        ]);

        $response = $this->actingAs($recipient)
            ->from('/apps/our-mailbox/messages')
            ->delete('/apps/our-mailbox/messages/'.$message->id);

        $response->assertForbidden();

        $this->assertDatabaseHas('mailbox_messages', ['id' => $message->id]);
    }
}
