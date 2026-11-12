<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Notify;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use Tests\TestCase;

class NotifyEmailChannelTest extends TestCase
{
    use RefreshDatabase;

    public function test_shape_a_with_email_channel_triggers_mail_fake(): void
    {
        Notification::fake();
        Mail::fake();

        /** @var User $user */
        $user = User::factory()->create();

        app(Notify::class)->send($user, [
            'app' => 'shell',
            'title' => 'Test',
            'body' => 'Hello from Ghar',
        ], ['email']);

        // The notification was dispatched (Notify::send did its job)
        Notification::assertSentTo(
            $user,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($user) {
                // Verify via() includes 'mail' for the email channel
                $via = $notification->via($user);

                return in_array('mail', $via, true);
            }
        );
    }

    public function test_shape_a_with_both_channels_routes_both(): void
    {
        Notification::fake();
        Mail::fake();

        /** @var User $user */
        $user = User::factory()->create();

        app(Notify::class)->send($user, [
            'app' => 'our-history',
            'title' => 'New memory',
            'body' => 'A memory was added',
        ], ['push', 'email']);

        Notification::assertSentTo(
            $user,
            GenericPushNotification::class,
            function (GenericPushNotification $notification) use ($user) {
                $via = $notification->via($user);

                return in_array(WebPushChannel::class, $via, true)
                    && in_array('mail', $via, true);
            }
        );
    }
}
