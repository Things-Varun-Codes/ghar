<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Notifications\InvitationNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SendInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_can_send_invite(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)
            ->post(route('admin.invites.store'), [
                'email' => 'invitee@example.com',
                'role' => 'user',
            ]);

        $response->assertRedirect(route('admin.invites.index'));
        $this->assertDatabaseHas('invitations', [
            'email' => 'invitee@example.com',
            'role_name' => 'user',
        ]);

        Notification::assertSentOnDemand(InvitationNotification::class);
    }

    public function test_guest_cannot_send_invite(): void
    {
        $response = $this->post(route('admin.invites.store'), [
            'email' => 'invitee@example.com',
            'role' => 'user',
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_invite_stores_hash_not_plaintext_token(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('admin.invites.store'), [
                'email' => 'test@example.com',
                'role' => 'user',
            ]);

        $invitation = Invitation::where('email', 'test@example.com')->firstOrFail();

        // token_hash should be a 64-char hex string (sha256)
        $this->assertSame(64, strlen($invitation->token_hash));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $invitation->token_hash);

        // 7-day expiry.
        $this->assertTrue($invitation->expires_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)));
    }

    public function test_invite_email_validation_rejects_invalid_email(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)
            ->post(route('admin.invites.store'), [
                'email' => 'not-an-email',
                'role' => 'user',
            ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertDatabaseCount('invitations', 0);
    }

    public function test_invite_role_validation_rejects_unknown_role(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)
            ->post(route('admin.invites.store'), [
                'email' => 'test@example.com',
                'role' => 'superuser',
            ]);

        $response->assertSessionHasErrors(['role']);
        $this->assertDatabaseCount('invitations', 0);
    }
}
