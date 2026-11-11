<?php

namespace Tests\Feature\RateLimit;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ForgotPasswordRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Notification::fake();
    }

    public function test_forgot_password_throttle_is_20_seconds(): void
    {
        $user = User::factory()->create();

        // First request — notification dispatches
        $response1 = $this->post(route('password.email'), [
            'email' => $user->email,
        ]);
        $this->assertNotEquals(429, $response1->status());

        $response2 = $this->post(route('password.email'), [
            'email' => $user->email,
        ]);

        $response2->assertRedirect();
        $response2->assertSessionDoesntHaveErrors();  // No error leak
        $this->assertSame(
            $response1->getSession()->get('status'),
            $response2->getSession()->get('status'),
            'Throttled response must be shape-equal to the first (enumeration resistance).'
        );

        // The actual throttle effect: only one notification was queued, not two.
        Notification::assertSentToTimes($user, \App\Shell\Notifications\ResetPasswordNotification::class, 1);
    }

    public function test_forgot_password_page_renders(): void
    {
        $response = $this->get(route('password.request'));

        $response->assertOk();
    }
}
