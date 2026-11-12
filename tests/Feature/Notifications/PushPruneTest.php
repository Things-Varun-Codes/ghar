<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Minishlink\WebPush\MessageSentReport;
use Mockery;
use NotificationChannels\WebPush\ReportHandler;
use NotificationChannels\WebPush\WebPushMessage;
use Tests\TestCase;

class PushPruneTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_pruned_when_push_service_returns_410(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create a real subscription row in the DB
        $subscription = $user->updatePushSubscription(
            'https://fcm.googleapis.com/fcm/send/prune-test-endpoint',
            'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE=',
            'tBHItJI5svbpez7KI4CCXg==',
            'aesgcm',
        );

        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/prune-test-endpoint',
        ]);

        // Mock MessageSentReport to simulate a 410 Gone response
        $report = Mockery::mock(MessageSentReport::class);
        $report->shouldReceive('isSuccess')->andReturn(false);
        $report->shouldReceive('isSubscriptionExpired')->andReturn(true);

        // Mock the WebPushMessage (needed by handleReport signature)
        $message = Mockery::mock(WebPushMessage::class);

        // Resolve the ReportHandler from the container (real instance with real Dispatcher)
        $handler = app(ReportHandler::class);

        // Execute the prune
        $handler->handleReport($report, $subscription, $message);

        // The subscription row should be gone
        $this->assertDatabaseMissing('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/prune-test-endpoint',
        ]);
    }

    public function test_active_subscription_not_pruned_when_push_service_returns_200(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create a real subscription row in the DB
        $subscription = $user->updatePushSubscription(
            'https://fcm.googleapis.com/fcm/send/active-endpoint',
            'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE=',
            'tBHItJI5svbpez7KI4CCXg==',
            'aesgcm',
        );

        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/active-endpoint',
        ]);

        // Mock MessageSentReport to simulate a 200 OK (success) response
        $report = Mockery::mock(MessageSentReport::class);
        $report->shouldReceive('isSuccess')->andReturn(true);
        // isSubscriptionExpired is NOT called on success path (short-circuits in
        // ReportHandler)
        $report->shouldNotReceive('isSubscriptionExpired');

        // Mock the WebPushMessage
        $message = Mockery::mock(WebPushMessage::class);

        $handler = app(ReportHandler::class);
        $handler->handleReport($report, $subscription, $message);

        // Row must still exist
        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/active-endpoint',
        ]);
    }
}
