<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\User;
use App\Shell\Notifications\ResetPasswordNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_forgot_password_page_renders(): void
    {
        $response = $this->get(route('password.request'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Auth/ForgotPassword'));
    }

    public function test_reset_password_link_is_sent(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->post(route('password.email'), [
            'email' => $user->email,
        ]);

        $response->assertRedirect();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_password_page_renders(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $response = $this->get(route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Auth/ResetPassword'));
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $token = Password::createToken($user);

        $response = $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertRedirect();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NewPassword123!', $user->fresh()->password));
    }

    public function test_invalid_token_does_not_reset_password(): void
    {
        $user = User::factory()->create(['password' => \Illuminate\Support\Facades\Hash::make('OriginalPassword1!')]);

        $this->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('OriginalPassword1!', $user->fresh()->password));
    }

    public function test_forgot_password_response_is_indistinguishable_for_known_and_unknown_emails(): void
    {
        Notification::fake();

        $known = User::factory()->create();

        $knownResponse = $this->from('/forgot-password')->post(route('password.email'), [
            'email' => $known->email,
        ]);

        $unknownResponse = $this->from('/forgot-password')->post(route('password.email'), [
            'email' => 'nobody-here-'.uniqid().'@example.test',
        ]);

        // Status codes must match — Fortify default leaks via 422 on the unknown path.
        $this->assertSame(
            $knownResponse->status(),
            $unknownResponse->status(),
            'Known and unknown email responses must return the same HTTP status — Fortify default leaks via 422.'
        );

        // Flash status must match — both paths must set session('status') to the  success
        // message; default Fortify leaks via withErrors() on the unknown path.
        $this->assertSame(
            $knownResponse->getSession()->get('status'),
            $unknownResponse->getSession()->get('status'),
            'Both paths must flash the same session status — default Fortify leaks via withErrors().'
        );

        // No validation errors on either path — error bag must be empty for both.
        $this->assertSame(
            $knownResponse->getSession()->get('errors')?->toArray() ?? [],
            $unknownResponse->getSession()->get('errors')?->toArray() ?? [],
            'Neither path may surface validation errors — default Fortify reveals "we cant find a user" via the errors bag.'
        );
    }
}
