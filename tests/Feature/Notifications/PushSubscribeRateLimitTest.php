<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PushSubscribeRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        ThrottleRequests::shouldHashKeys(false);
    }

    protected function tearDown(): void
    {
        // Restore hashing to the default so other tests are not affected.
        ThrottleRequests::shouldHashKeys(true);
        parent::tearDown();
    }

    public function test_subscribe_endpoint_is_throttled_at_ten_per_minute(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Clear any residual hits for this user before starting
        RateLimiter::clear("push-subscriptions:{$user->id}");

        $endpoint = 'https://fcm.googleapis.com/fcm/send/test-throttle-subscribe';
        $p256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE=';
        $auth = 'tBHItJI5svbpez7KI4CCXg==';

        // Exhaust the limiter by pre-seeding 10 hits
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit("push-subscriptions:{$user->id}");
        }

        // 11th request should be throttled
        $response = $this->actingAs($user)->post(route('settings.notifications.subscribe'), [
            'endpoint' => $endpoint,
            'p256dh' => $p256dh,
            'auth' => $auth,
        ]);

        $response->assertStatus(429);

        // Clean up
        RateLimiter::clear("push-subscriptions:{$user->id}");
    }

    public function test_unsubscribe_endpoint_is_throttled_at_ten_per_minute(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Clear any residual hits for this user before starting
        RateLimiter::clear("push-subscriptions:{$user->id}");

        $endpoint = 'https://fcm.googleapis.com/fcm/send/test-throttle-unsubscribe';

        // Exhaust the limiter by pre-seeding 10 hits
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit("push-subscriptions:{$user->id}");
        }

        // 11th request should be throttled
        $response = $this->actingAs($user)->delete(route('settings.notifications.unsubscribe'), [
            'endpoint' => $endpoint,
        ]);

        $response->assertStatus(429);

        // Clean up
        RateLimiter::clear("push-subscriptions:{$user->id}");
    }

    public function test_throttle_is_keyed_per_user_not_global(): void
    {
        /** @var User $userA */
        $userA = User::factory()->create();

        /** @var User $userB */
        $userB = User::factory()->create();

        // Clear both buckets
        RateLimiter::clear("push-subscriptions:{$userA->id}");
        RateLimiter::clear("push-subscriptions:{$userB->id}");

        // Exhaust User A's bucket completely
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit("push-subscriptions:{$userA->id}");
        }

        // User B should NOT be throttled (independent bucket)
        $response = $this->actingAs($userB)->post(route('settings.notifications.subscribe'), [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/user-b-endpoint',
            'p256dh' => 'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE=',
            'auth' => 'tBHItJI5svbpez7KI4CCXg==',
        ]);

        $this->assertNotEquals(429, $response->status(), 'User B should not be throttled by User A\'s rate limit usage');

        // Clean up
        RateLimiter::clear("push-subscriptions:{$userA->id}");
        RateLimiter::clear("push-subscriptions:{$userB->id}");
    }
}
