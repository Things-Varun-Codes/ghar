<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class RevokedInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Notification::fake();
    }

    public function test_revoked_invite_show_redirects_to_login(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'revoked_at' => now(),  // revoked
            'invited_by_user_id' => $admin->id,
        ]);

        $response = $this->get(route('invitations.accept.show', ['token' => $plaintext]));

        $response->assertRedirect(route('login'));
    }

    public function test_admin_can_revoke_pending_invite(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        $invitation = Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->delete(route('admin.invites.destroy', ['invite' => $invitation->id]));

        $response->assertRedirect(route('admin.invites.index'));
        $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Invitation revoked.']);

        $invitation->refresh();
        $this->assertNotNull($invitation->revoked_at);
    }

    public function test_revoked_invite_post_does_not_create_user(): void
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'revoked_at' => now(),
            'invited_by_user_id' => $admin->id,
        ]);

        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $this->assertDatabaseMissing('users', ['email' => 'invitee@example.com']);
    }
}
