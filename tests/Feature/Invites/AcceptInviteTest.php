<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class AcceptInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Notification::fake();
    }

    private function makeInvitation(string $email = 'invitee@example.com', string $role = 'user'): array
    {
        $admin = User::factory()->admin()->create();
        $plaintext = Str::random(64);

        $invitation = Invitation::forceCreate([
            'email' => $email,
            'role_name' => $role,
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
        ]);

        return ['invitation' => $invitation, 'plaintext' => $plaintext];
    }

    public function test_show_renders_invite_accept_form_for_valid_token(): void
    {
        ['plaintext' => $plaintext] = $this->makeInvitation();

        $response = $this->get(route('invitations.accept.show', ['token' => $plaintext]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Auth/InviteAccept'));
    }

    public function test_accept_creates_user_and_assigns_role(): void
    {
        ['invitation' => $invitation, 'plaintext' => $plaintext] = $this->makeInvitation();

        $response = $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertRedirect(route('dashboard'));

        $user = User::where('email', $invitation->email)->firstOrFail();
        $this->assertSame('New User', $user->name);
        $this->assertTrue($user->hasRole('user'));

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
    }

    public function test_accept_logs_user_in_after_registration(): void
    {
        ['plaintext' => $plaintext] = $this->makeInvitation();

        $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $this->assertAuthenticated();
    }

    public function test_invalid_token_redirects_to_login(): void
    {
        $response = $this->get(route('invitations.accept.show', ['token' => 'invalid-token']));

        $response->assertRedirect(route('login'));
    }

    public function test_invalid_token_on_post_redirects_to_login(): void
    {
        $response = $this->post(route('invitations.accept.store', ['token' => 'bad-token']), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_password_confirmation_required(): void
    {
        ['plaintext' => $plaintext] = $this->makeInvitation();

        $response = $this->post(route('invitations.accept.store', ['token' => $plaintext]), [
            'name' => 'New User',
            'password' => 'Password123!',
            'password_confirmation' => 'DifferentPassword!',
        ]);

        $response->assertSessionHasErrors(['password']);
        $this->assertDatabaseMissing('users', ['email' => 'invitee@example.com']);
    }
}
