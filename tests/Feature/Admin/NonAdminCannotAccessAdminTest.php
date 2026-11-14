<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NonAdminCannotAccessAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_regular_user_cannot_access_admin_users(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_regular_user_cannot_access_admin_invites(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.invites.index'))->assertForbidden();
    }

    public function test_regular_user_cannot_post_invite(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.invites.store'), ['email' => 'x@x.com', 'role' => 'user'])
            ->assertForbidden();

        $this->assertDatabaseCount('invitations', 0);
    }

    public function test_regular_user_cannot_patch_user_role(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('admin.users.update', ['user' => $other->id]), ['role' => 'admin'])
            ->assertForbidden();
    }

    public function test_regular_user_cannot_delete_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.users.destroy', ['user' => $other->id]))
            ->assertForbidden();
    }
}
