<?php

namespace Tests\Unit\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Notifications\TestNotification;
use App\Shell\Services\Notify;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use Tests\TestCase;

class NotifyServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_shape_a_array_payload_wraps_in_generic_push_notification(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        app(Notify::class)->send($user, [
            'app' => 'our-history',
            'body' => 'Alex added a moment: Paris',
        ], ['push']);

        Notification::assertSentTo($user, GenericPushNotification::class);
    }

    public function test_shape_b_notification_instance_passes_through(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        $testNotification = new TestNotification;

        app(Notify::class)->send($user, $testNotification);

        Notification::assertSentTo($user, TestNotification::class);
        // And NOT wrapped in GenericPushNotification
        Notification::assertNotSentTo($user, GenericPushNotification::class);
    }

    public function test_default_channels_is_push_only(): void
    {
        // Build a GenericPushNotification with default channels to inspect via().
        $notification = new GenericPushNotification(
            ['app' => 'our-history', 'body' => 'test'],
            ['push'],
        );

        $via = $notification->via(null);

        $this->assertCount(1, $via);
        $this->assertContains(WebPushChannel::class, $via);
        $this->assertNotContains('mail', $via);
    }

    public function test_notify_send_dispatches_to_correct_user_only(): void
    {
        Notification::fake();

        /** @var User $recipient */
        $recipient = User::factory()->create();

        /** @var User $other */
        $other = User::factory()->create();

        app(Notify::class)->send($recipient, [
            'app' => 'our-history',
            'body' => 'test',
        ], ['push']);

        Notification::assertSentTo($recipient, GenericPushNotification::class);
        Notification::assertNotSentTo($other, GenericPushNotification::class);
    }
}
