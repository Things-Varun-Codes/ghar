<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UnusableInviteTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{string}> */
    public static function states(): array
    {
        return [
            'expired' => ['expired'],
            'revoked' => ['revoked'],
            'already accepted' => ['accepted'],
        ];
    }

    #[DataProvider('states')]
    public function test_an_invite_that_is_no_longer_pending_cannot_be_opened_or_accepted(string $state): void
    {
        $this->seed(RoleSeeder::class);
        $plaintext = Str::random(64);

        Invitation::factory()->create([
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => $state === 'expired' ? now()->subDay() : now()->addDays(7),
            'revoked_at' => $state === 'revoked' ? now() : null,
            'accepted_at' => $state === 'accepted' ? now() : null,
        ]);

        $this->get(route('invitations.accept.show', ['token' => $plaintext]))
            ->assertRedirect(route('login'));

        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertRedirect(route('login'));

        $this->assertDatabaseMissing('users', ['email' => 'invitee@example.com']);
        $this->assertGuest();
    }
}
