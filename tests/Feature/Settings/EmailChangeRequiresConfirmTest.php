<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use App\Shell\Notifications\VerifyChangedEmailNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailChangeRequiresConfirmTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_changing_email_sends_verification_and_leaves_the_address_unchanged(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => 'new@example.com',
            ]);

        Notification::assertSentTo($user, VerifyChangedEmailNotification::class);

        // Nothing changes until the emailed link is clicked.
        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_valid_signed_url_updates_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);

        $signedUrl = URL::temporarySignedRoute(
            'settings.email.verify',
            now()->addHour(),
            ['user' => $user->id, 'email' => 'new@example.com']
        );

        $response = $this->actingAs($user)->get($signedUrl);

        $response->assertRedirect(route('settings.profile.show'));
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_expired_signed_url_does_not_update_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);

        $signedUrl = URL::temporarySignedRoute(
            'settings.email.verify',
            now()->subMinute(),  // expired
            ['user' => $user->id, 'email' => 'new@example.com']
        );

        $response = $this->actingAs($user)->get($signedUrl);

        $response->assertRedirect(route('settings.profile.show'));
        $response->assertSessionHasErrors(['email']);
        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_tampered_signed_url_does_not_update_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);

        // Build a valid URL then tamper with the email param
        $validUrl = URL::temporarySignedRoute(
            'settings.email.verify',
            now()->addHour(),
            ['user' => $user->id, 'email' => 'legit@example.com']
        );

        $tamperedUrl = str_replace('legit%40example.com', 'hacker%40example.com', $validUrl);

        $response = $this->actingAs($user)->get($tamperedUrl);

        $response->assertRedirect(route('settings.profile.show'));
        $this->assertSame('old@example.com', $user->fresh()->email);
    }
}
