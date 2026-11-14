<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Support\SessionKey;
use Tests\TestCase;

class PushSubscribeTest extends TestCase
{
    use RefreshDatabase;

    private string $testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-abc123';

    private string $testP256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtfuJYMdBETGGv8kXHfCvqJI9JGKbVx5mJTsMIXl5Lfq8vSNWxQJMOlLuOsYGE=';

    private string $testAuth = 'tBHItJI5svbpez7KI4CCXg==';

    public function test_authenticated_post_persists_a_push_subscription_row(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('settings.notifications.subscribe'), [
            'endpoint' => $this->testEndpoint,
            'p256dh' => $this->testP256dh,
            'auth' => $this->testAuth,
            'content_encoding' => 'aesgcm',
        ]);

        $response->assertRedirect(route('settings.notifications.show'));

        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => $this->testEndpoint,
            'subscribable_type' => User::class,
            'subscribable_id' => $user->id,
        ]);

        $response->assertSessionHas(SessionKey::FLASH_DATA, function ($flash) {
            return isset($flash['toast'])
                && $flash['toast']['type'] === 'success'
                && str_contains($flash['toast']['message'], 'now subscribed');
        });
        $response->assertSessionMissing('success');
    }

    public function test_authenticated_delete_removes_a_push_subscription_row(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Seed a subscription first
        $user->updatePushSubscription(
            $this->testEndpoint,
            $this->testP256dh,
            $this->testAuth,
            'aesgcm',
        );

        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $this->testEndpoint]);

        $response = $this->actingAs($user)->delete(route('settings.notifications.unsubscribe'), [
            'endpoint' => $this->testEndpoint,
        ]);

        $response->assertRedirect(route('settings.notifications.show'));

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => $this->testEndpoint]);

        $response->assertSessionHas(SessionKey::FLASH_DATA, function ($flash) {
            return isset($flash['toast'])
                && $flash['toast']['type'] === 'success'
                && str_contains($flash['toast']['message'], 'unsubscribed');
        });
        $response->assertSessionMissing('success');
    }

    public function test_subscribe_requires_authentication(): void
    {
        $response = $this->post(route('settings.notifications.subscribe'), [
            'endpoint' => $this->testEndpoint,
            'p256dh' => $this->testP256dh,
            'auth' => $this->testAuth,
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_subscribe_validates_required_fields(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('settings.notifications.subscribe'), []);

        $response->assertSessionHasErrors(['endpoint', 'p256dh', 'auth']);
    }

    public function test_subscribe_takes_an_endpoint_of_1024_chars_and_refuses_a_longer_one(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $prefix = 'https://fcm.googleapis.com/';
        $longest = $prefix.str_repeat('a', 1024 - strlen($prefix));

        $this->actingAs($user)->post(route('settings.notifications.subscribe'), [
            'endpoint' => $longest,
            'p256dh' => $this->testP256dh,
            'auth' => $this->testAuth,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $longest]);

        $this->actingAs($user)->post(route('settings.notifications.subscribe'), [
            'endpoint' => $longest.'a',
            'p256dh' => $this->testP256dh,
            'auth' => $this->testAuth,
        ])->assertSessionHasErrors('endpoint');
    }

    public function test_show_returns_user_subscriptions(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        // Create a subscription for this user
        $user->updatePushSubscription(
            $this->testEndpoint,
            $this->testP256dh,
            $this->testAuth,
            'aesgcm',
        );

        $response = $this->actingAs($user)->get(route('settings.notifications.show'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Shell/Pages/Settings/Notifications')
            ->has('subscriptions')
            ->where('vapidPublicKey', config('webpush.vapid.public_key'))
        );
    }
}
