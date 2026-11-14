<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvitationSurvivesInviterDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_invitation_survives_inviter_deletion_with_null_inviter(): void
    {
        // Two admins so the last-admin guard is irrelevant — this test goes  direct to the
        // model/DB layer, not through the admin controller.
        $inviter = User::factory()->admin()->create();
        User::factory()->admin()->create();

        $invitation = Invitation::forceCreate([
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', 'plaintext-token'),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $inviter->id,
        ]);

        $inviter->delete();

        $invitation->refresh();

        $this->assertDatabaseHas('invitations', ['id' => $invitation->id]);
        $this->assertNull($invitation->invited_by_user_id);
    }
}
