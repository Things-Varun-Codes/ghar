<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AdminSendNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_can_send_push_only(): void
    {
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        /** @var User $recipient */
        $recipient = User::factory()->create(['name' => 'Sam Lee']);

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => $recipient->id,
            'title' => 'Test Push',
            'body' => 'This is a test push notification.',
            'url' => '/dashboard',
            'channels' => ['push'],
        ]);

        $response->assertRedirect(route('admin.notifications.show'));

        // Flash string must start with 'Sent push to'
        $response->assertSessionHas('success', fn ($value) => str_starts_with($value, 'Sent push to'));

        Notification::assertSentTo($recipient, GenericPushNotification::class);
    }

    public function test_admin_can_send_email_only(): void
    {
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        /** @var User $recipient */
        $recipient = User::factory()->create(['name' => 'Sam Lee']);

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => $recipient->id,
            'title' => 'Test Email',
            'body' => 'This is a test email notification.',
            'url' => null,
            'channels' => ['email'],
        ]);

        $response->assertRedirect(route('admin.notifications.show'));

        // Flash string must start with 'Sent email to'
        $response->assertSessionHas('success', fn ($value) => str_starts_with($value, 'Sent email to'));

        Notification::assertSentTo($recipient, GenericPushNotification::class);
    }

    public function test_admin_can_send_both_channels(): void
    {
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        /** @var User $recipient */
        $recipient = User::factory()->create(['name' => 'Sam Lee']);

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => $recipient->id,
            'title' => 'Both Channels Test',
            'body' => 'Push and email.',
            'url' => null,
            'channels' => ['push', 'email'],
        ]);

        $response->assertRedirect(route('admin.notifications.show'));

        // Flash must mention both 'push' and 'email' substrings
        $response->assertSessionHas('success', fn ($value) => str_contains($value, 'push') && str_contains($value, 'email'));

        Notification::assertSentTo($recipient, GenericPushNotification::class);
    }

    public function test_non_admin_cannot_access_routes(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.notifications.show'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.notifications.send'), [
            'user_id' => $user->id,
            'title' => 'test',
            'body' => 'test',
            'channels' => ['push'],
        ])->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_routes(): void
    {
        $this->get(route('admin.notifications.show'))->assertRedirect(route('login'));
        $this->post(route('admin.notifications.send'), [])->assertRedirect(route('login'));
    }

    public function test_empty_channels_returns_422(): void
    {
        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        /** @var User $recipient */
        $recipient = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => $recipient->id,
            'title' => 'Test',
            'body' => 'Test body',
            'channels' => [],
        ]);

        $response->assertSessionHasErrors('channels');
    }

    public function test_missing_user_id_returns_422(): void
    {
        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'title' => 'Test',
            'body' => 'Test body',
            'channels' => ['push'],
        ]);

        $response->assertSessionHasErrors('user_id');
    }

    public function test_nonexistent_user_id_returns_422(): void
    {
        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => 999999,
            'title' => 'Test',
            'body' => 'Test body',
            'channels' => ['push'],
        ]);

        $response->assertSessionHasErrors('user_id');
    }

    public function test_send_respects_admin_mutations_throttle(): void
    {
        ThrottleRequests::shouldHashKeys(false);

        /** @var User $admin */
        $admin = User::factory()->admin()->create();

        // Clear the bucket first
        RateLimiter::clear("admin-mutations:{$admin->id}");

        // Pre-seed 30 hits to exhaust the limiter
        for ($i = 0; $i < 30; $i++) {
            RateLimiter::hit("admin-mutations:{$admin->id}");
        }

        // 31st request should be throttled
        $response = $this->actingAs($admin)->post(route('admin.notifications.send'), [
            'user_id' => $admin->id,
            'title' => 'Over limit',
            'body' => 'This should be throttled',
            'channels' => ['push'],
        ]);

        $response->assertStatus(429);

        // Clean up
        RateLimiter::clear("admin-mutations:{$admin->id}");
        ThrottleRequests::shouldHashKeys(true);
    }
}
