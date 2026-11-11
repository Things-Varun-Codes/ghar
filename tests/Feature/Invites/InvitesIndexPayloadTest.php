<?php

namespace Tests\Feature\Invites;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class InvitesIndexPayloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_sends_only_the_fields_the_page_renders(): void
    {
        $this->seed(RoleSeeder::class);
        $admin = User::factory()->admin()->create(['name' => 'Asha']);

        $invite = new Invitation([
            'email' => 'kid@example.test',
            'role_name' => 'user',
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => $admin->id,
        ]);
        $invite->token_hash = hash('sha256', 'secret');
        $invite->save();

        $this->actingAs($admin)
            ->get(route('admin.invites.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('invites.data', 1, fn (AssertableInertia $row) => $row
                    ->where('id', $invite->id)
                    ->where('email', 'kid@example.test')
                    ->where('role_name', 'user')
                    ->has('expires_at')
                    ->where('accepted_at', null)
                    ->where('revoked_at', null)
                    ->has('created_at')
                    ->where('invited_by', ['id' => $admin->id, 'name' => 'Asha'])
                )
                ->has('invites.links')
            );
    }

    public function test_token_hash_never_serializes(): void
    {
        $invite = new Invitation(['email' => 'kid@example.test']);
        $invite->token_hash = 'hash';

        $this->assertArrayNotHasKey('token_hash', $invite->toArray());
    }
}
