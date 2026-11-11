<?php

namespace Tests\Feature\Notifications;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EventStoreNotifyTriggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_create_fires_notify_send_to_every_other_user(): void
    {
        Notification::fake();

        /** @var User $actorA */
        $actorA = User::factory()->create(['name' => 'Alice Smith']);

        /** @var User $userB */
        $userB = User::factory()->create();

        /** @var User $userC */
        $userC = User::factory()->create();

        $this->actingAs($actorA)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-06-01',
            'title' => 'Paris Trip',
        ])->assertRedirect(route('apps.our-history.timeline'));

        Notification::assertSentTo($userB, GenericPushNotification::class);
        Notification::assertSentTo($userC, GenericPushNotification::class);
        // Actor (User A) does NOT receive the notification (excluded).
        Notification::assertNotSentTo($actorA, GenericPushNotification::class);
    }

    public function test_event_update_does_not_fire_notify_send(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create([
            'creator_id' => $user->id,
            'occurred_on' => '2024-06-01',
            'title' => 'Original title',
        ]);

        $this->actingAs($user)->patch(route('apps.our-history.events.update', $event), [
            'occurred_on' => '2024-06-01',
            'title' => 'Updated title',
        ])->assertRedirect(route('apps.our-history.timeline'));

        // UPDATE is silent, no notification dispatched
        Notification::assertNothingSent();
    }

    public function test_event_delete_does_not_fire_notify_send(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        /** @var Event $event */
        $event = Event::factory()->create([
            'creator_id' => $user->id,
            'occurred_on' => '2024-06-01',
        ]);

        $this->actingAs($user)->delete(route('apps.our-history.events.destroy', $event))
            ->assertRedirect(route('apps.our-history.timeline'));

        // DELETE is silent, no notification dispatched
        Notification::assertNothingSent();
    }

    public function test_create_with_null_title_uses_untitled_fallback(): void
    {
        Notification::fake();

        /** @var User $actor */
        $actor = User::factory()->create(['name' => 'Alex Doe']);

        /** @var User $recipient */
        $recipient = User::factory()->create();

        $this->actingAs($actor)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-06-01',
            // No title — should fall back to 'untitled'
        ])->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                // Inspect the payload: the body should contain 'untitled'
                // GenericPushNotification's toWebPush uses $payload['body']
                // WebPushMessage::toArray() returns a flat array with 'body' as a top-level
                // key.
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $messageArray = $webPushMessage->toArray();

                return str_contains(strtolower($messageArray['body'] ?? ''), 'untitled');
            }
        );
    }

    public function test_create_uses_first_name_only_for_body(): void
    {
        Notification::fake();

        /** @var User $actor */
        $actor = User::factory()->create(['name' => 'Alex Doe']);

        /** @var User $recipient */
        $recipient = User::factory()->create();

        $this->actingAs($actor)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-06-01',
            'title' => 'Paris',
        ])->assertRedirect();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($recipient) {
                // WebPushMessage::toArray() returns a flat array with 'body' as a top-level
                // key.
                $webPushMessage = $notification->toWebPush($recipient, $notification);
                $messageArray = $webPushMessage->toArray();
                $body = $messageArray['body'] ?? '';

                return $body === 'Alex added a moment: Paris';
            }
        );
    }
}
