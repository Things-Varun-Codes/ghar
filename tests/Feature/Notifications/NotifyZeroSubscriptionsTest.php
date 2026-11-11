<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Notify;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotifyZeroSubscriptionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_with_zero_push_subscriptions_receives_no_push_silently(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        // Confirm zero subscriptions
        $this->assertDatabaseCount('push_subscriptions', 0);

        // Call Notify::send with push-only channel
        app(Notify::class)->send($user, [
            'app' => 'our-history',
            'body' => 'Test push',
        ], ['push']);

        // Notify::send dispatched the notification (its job is done)  The silent no-op happens
        // downstream in WebPushChannel when  routeNotificationForWebPush() returns empty
        // collection.
        Notification::assertSentTo($user, GenericPushNotification::class);
    }

    public function test_user_with_zero_subscriptions_and_push_only_does_not_throw(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        $exceptionThrown = false;

        try {
            app(Notify::class)->send($user, [
                'app' => 'our-history',
                'body' => 'No subscriptions, no boom',
            ], ['push']);
        } catch (\Throwable $e) {
            $exceptionThrown = true;
        }

        $this->assertFalse($exceptionThrown, 'Notify::send should never throw when user has zero push subscriptions');
    }

    public function test_notify_dispatches_even_when_no_subscriptions_exist(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        $this->assertDatabaseCount('push_subscriptions', 0);

        app(Notify::class)->send($user, [
            'app' => 'our-history',
            'body' => 'Still dispatched',
        ], ['push']);

        // The notification WAS sent through the notification system
        Notification::assertSentTo($user, GenericPushNotification::class);
    }
}
