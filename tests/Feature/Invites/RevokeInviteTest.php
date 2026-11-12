<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class RevokeInviteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        Notification::fake();
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
}
