<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class SingleUseInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Notification::fake();
    }

    public function test_accepted_invite_cannot_be_used_again(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        $invitation = Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'accepted_at' => now(),  // already accepted
            'invited_by_user_id' => $admin->id,
        ]);

        $response = $this->get(route('invitations.accept.show', ['token' => $plaintext]));

        $response->assertRedirect(route('login'));
    }

    public function test_accepted_invite_post_does_not_create_second_user(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'accepted_at' => now(),
            'invited_by_user_id' => $admin->id,
        ]);

        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'Second User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        // No user should be created via this path
        $this->assertDatabaseMissing('users', ['name' => 'Second User']);
    }
}
